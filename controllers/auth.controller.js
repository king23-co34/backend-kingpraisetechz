const speakeasy = require('speakeasy');
const qrcode    = require('qrcode');
const crypto    = require('crypto');
const User      = require('../models/User.model');
const { generateTokens, verifyRefreshToken } = require('../utils/jwt.utils');
const {
  sendWelcomeEmail,
  sendTwoFactorSetupEmail,
  sendPasswordResetEmail
} = require('../services/email.service');

// ─────────────────────────────────────────────────────────────────────
// POST /api/auth/register
// Register client or team member
// ─────────────────────────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, company, industry, jobTitle, skills, phone } = req.body;

    // Only client and team can self-register
    if (!['client', 'team'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role. Only client or team registration is allowed.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ success: false, message: 'Email already registered.' });

    const userData = {
      firstName, lastName, email, password, role, phone,
      ...(role === 'client' ? { company, industry } : {}),
      ...(role === 'team'   ? { jobTitle, skills: skills || [] } : {})
    };

    const user = await User.create(userData);

    // Send welcome email (async, don't await)
    sendWelcomeEmail(user).catch(console.error);

    // Send 2FA setup reminder
    sendTwoFactorSetupEmail(user).catch(console.error);

    res.status(201).json({
      success: true,
      message: 'Account created successfully. Please set up 2FA to complete your login.',
      data: {
        user: user.toSafeObject(),
        nextStep: 'setup_2fa'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// Login - Step 1: verify credentials
// ─────────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    if (!user.isActive) return res.status(403).json({ success: false, message: 'Account deactivated. Contact admin.' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials.' });

    // ── Admin: skip 2FA, issue tokens directly ─────────────────
    if (user.role === 'admin' && !user.isTemporaryAdmin) {
      user.lastLoginAt = new Date();
      await user.save();

      const { accessToken, refreshToken } = generateTokens(user);
      return res.json({
        success: true,
        message: 'Login successful.',
        data: {
          user: user.toSafeObject(),
          accessToken,
          refreshToken,
          requires2FA: false,
          dashboardRole: 'admin'
        }
      });
    }

    // ── Non-admin: require 2FA ─────────────────────────────────
    if (!user.twoFactorEnabled) {
      // Must set up 2FA first — return a temp token for setup only
      const setupToken = require('jsonwebtoken').sign(
        { id: user._id, purpose: 'setup_2fa' },
        process.env.JWT_SECRET,
        { expiresIn: '30m' }
      );
      return res.json({
        success: true,
        message: 'Credentials valid. Please set up 2FA.',
        data: {
          requires2FA: false,
          needs2FASetup: true,
          setupToken,
          userId: user._id
        }
      });
    }

    // 2FA is enabled — ask for OTP
    // Return a partial token (valid only for 2FA verification, short TTL)
    const partialToken = require('jsonwebtoken').sign(
      { id: user._id, purpose: 'verify_2fa' },
      process.env.JWT_SECRET,
      { expiresIn: '10m' }
    );

    res.json({
      success: true,
      message: 'Credentials valid. Please enter your 2FA code.',
      data: {
        requires2FA:  true,
        partialToken,
        userId: user._id
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────
// POST /api/auth/2fa/setup
// Generate 2FA secret and QR code
// ─────────────────────────────────────────────────────────────────────
exports.setup2FA = async (req, res) => {
  try {
    const { setupToken } = req.body;
    const jwt = require('jsonwebtoken');

    let decoded;
    try {
      decoded = jwt.verify(setupToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired setup token.' });
    }

    if (decoded.purpose !== 'setup_2fa') {
      return res.status(400).json({ success: false, message: 'Invalid token purpose.' });
    }

    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    // Generate 2FA secret
    const secret = speakeasy.generateSecret({
      name:   `${process.env.TWO_FA_APP_NAME || 'DashboardPlatform'} (${user.email})`,
      length: 32
    });

    user.twoFactorSecret = secret.base32;
    await user.save();

    // Generate QR code
    const qrCodeDataURL = await qrcode.toDataURL(secret.otpauth_url);

    res.json({
      success: true,
      message: '2FA secret generated. Scan the QR code with Google Authenticator.',
      data: {
        qrCode:      qrCodeDataURL,
        manualKey:   secret.base32,
        otpauthUrl:  secret.otpauth_url
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────
// POST /api/auth/2fa/enable
// Verify the OTP code and enable 2FA
// ─────────────────────────────────────────────────────────────────────
exports.enable2FA = async (req, res) => {
  try {
    const { setupToken, otp } = req.body;
    const jwt = require('jsonwebtoken');

    const decoded = jwt.verify(setupToken, process.env.JWT_SECRET);
    if (decoded.purpose !== 'setup_2fa') {
      return res.status(400).json({ success: false, message: 'Invalid token purpose.' });
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({ success: false, message: 'No 2FA secret found. Start setup again.' });
    }

    const isValid = speakeasy.totp.verify({
      secret:   user.twoFactorSecret,
      encoding: 'base32',
      token:    otp,
      window:   2
    });

    if (!isValid) return res.status(400).json({ success: false, message: 'Invalid OTP code. Try again.' });

    user.twoFactorEnabled  = true;
    user.twoFactorVerified = true;
    user.lastLoginAt       = new Date();
    user.onboardingComplete = true;
    await user.save();

    const { accessToken, refreshToken } = generateTokens(user);

    res.json({
      success: true,
      message: '2FA enabled successfully. You are now logged in.',
      data: {
        user: user.toSafeObject(),
        accessToken,
        refreshToken,
        dashboardRole: user.hasAdminAccess ? 'admin' : user.role
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────
// POST /api/auth/2fa/verify
// Verify OTP during login (when 2FA already set up)
// ─────────────────────────────────────────────────────────────────────
exports.verify2FA = async (req, res) => {
  try {
    const { partialToken, otp } = req.body;
    const jwt = require('jsonwebtoken');

    let decoded;
    try {
      decoded = jwt.verify(partialToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired token. Please login again.' });
    }

    if (decoded.purpose !== 'verify_2fa') {
      return res.status(400).json({ success: false, message: 'Invalid token purpose.' });
    }

    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    await user.checkAndRevokeTemporaryAdmin();

    const isValid = speakeasy.totp.verify({
      secret:   user.twoFactorSecret,
      encoding: 'base32',
      token:    otp,
      window:   2
    });

    if (!isValid) return res.status(400).json({ success: false, message: 'Invalid OTP code.' });

    user.lastLoginAt = new Date();
    await user.save();

    const { accessToken, refreshToken } = generateTokens(user);

    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        user: user.toSafeObject(),
        accessToken,
        refreshToken,
        dashboardRole: user.hasAdminAccess ? 'admin' : user.role
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────
// POST /api/auth/refresh
// Refresh access token
// ─────────────────────────────────────────────────────────────────────
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ success: false, message: 'Refresh token required.' });

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) return res.status(401).json({ success: false, message: 'Invalid refresh token.' });

    await user.checkAndRevokeTemporaryAdmin();

    const tokens = generateTokens(user);
    res.json({ success: true, data: tokens });
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid refresh token.' });
  }
};

// ─────────────────────────────────────────────────────────────────────
// POST /api/auth/forgot-password
// ─────────────────────────────────────────────────────────────────────
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    // Always return success to prevent email enumeration
    if (!user) return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken  = token;
    user.resetPasswordExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    await sendPasswordResetEmail(user, token);

    res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────
// POST /api/auth/reset-password
// ─────────────────────────────────────────────────────────────────────
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const user = await User.findOne({
      resetPasswordToken:  token,
      resetPasswordExpiry: { $gt: new Date() }
    });

    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired reset token.' });

    user.password            = newPassword;
    user.resetPasswordToken  = null;
    user.resetPasswordExpiry = null;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully. You can now login.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────
// GET /api/auth/me
// Get current user profile
// ─────────────────────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      success: true,
      data: {
        user: user.toSafeObject(),
        dashboardRole: user.hasAdminAccess ? 'admin' : user.role
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────
// PUT /api/auth/profile
// Update profile
// ─────────────────────────────────────────────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone, company, industry, jobTitle, skills, timezone } = req.body;
    const user = await User.findById(req.user._id);

    if (firstName) user.firstName = firstName;
    if (lastName)  user.lastName  = lastName;
    if (phone)     user.phone     = phone;
    if (timezone)  user.timezone  = timezone;

    if (user.role === 'client') {
      if (company)  user.company  = company;
      if (industry) user.industry = industry;
    }
    if (user.role === 'team') {
      if (jobTitle) user.jobTitle = jobTitle;
      if (skills)   user.skills   = skills;
    }

    if (req.file) user.avatar = req.file.path; // Cloudinary URL

    await user.save();
    res.json({ success: true, message: 'Profile updated.', data: { user: user.toSafeObject() } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────
// POST /api/auth/change-password
// ─────────────────────────────────────────────────────────────────────
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Current password is incorrect.' });

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};