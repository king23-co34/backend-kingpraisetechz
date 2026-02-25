const jwt = require('jsonwebtoken');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const User = require('../models/User');
const { sendEmail } = require('../services/email');

const generateTokens = (userId, role) => {
  const accessToken = jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  return { accessToken, refreshToken };
};

exports.signup = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, company, position } = req.body;
    
    // Prevent direct admin signup
    if (role === 'admin') {
      return res.status(403).json({ error: 'Admin accounts cannot be created via signup.' });
    }
    
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: 'Email already registered' });
    
    const user = new User({
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      role,
      company: role === 'client' ? company : undefined,
      position: role === 'team' ? position : undefined
    });
    
    await user.save();
    
    await sendEmail({
      to: user.email,
      template: 'welcome',
      data: [`${firstName} ${lastName}`, role]
    });
    
    // Generate 2FA secret for non-admin
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(user.email, 'SaaS Dashboard', secret);
    const qrCode = await QRCode.toDataURL(otpauth);
    
    await User.findByIdAndUpdate(user._id, { twoFactorSecret: secret });
    
    res.status(201).json({
      message: 'Account created. Please set up 2FA.',
      userId: user._id,
      twoFactorSetup: {
        qrCode,
        secret,
        otpauth
      }
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Failed to create account' });
  }
};

exports.verifyAndComplete2FASetup = async (req, res) => {
  try {
    const { userId, token } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const isValid = authenticator.verify({ token, secret: user.twoFactorSecret });
    if (!isValid) return res.status(400).json({ error: 'Invalid verification code' });
    
    await User.findByIdAndUpdate(userId, {
      twoFactorEnabled: true,
      twoFactorVerified: true
    });
    
    const { accessToken, refreshToken } = generateTokens(user._id, user.role);
    
    await sendEmail({
      to: user.email,
      template: 'twoFactorSetup',
      data: [`${user.firstName} ${user.lastName}`]
    });
    
    res.json({
      message: '2FA setup complete',
      accessToken,
      refreshToken,
      user: user.toSafeObject()
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify 2FA' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });
    
    if (!user.isActive) return res.status(403).json({ error: 'Account deactivated' });
    
    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });
    
    // Admin login - no 2FA required
    if (user.role === 'admin' || user.isAdminRole()) {
      const { accessToken, refreshToken } = generateTokens(user._id, user.role);
      return res.json({
        requiresTwoFactor: false,
        accessToken,
        refreshToken,
        user: user.toSafeObject()
      });
    }
    
    // Non-admin - require 2FA
    if (!user.twoFactorEnabled) {
      // User hasn't set up 2FA yet, generate setup
      const secret = user.twoFactorSecret || authenticator.generateSecret();
      if (!user.twoFactorSecret) {
        await User.findByIdAndUpdate(user._id, { twoFactorSecret: secret });
      }
      const otpauth = authenticator.keyuri(user.email, 'SaaS Dashboard', secret);
      const qrCode = await QRCode.toDataURL(otpauth);
      
      return res.json({
        requiresTwoFactorSetup: true,
        userId: user._id,
        twoFactorSetup: { qrCode, secret, otpauth }
      });
    }
    
    // Has 2FA, need to verify
    res.json({
      requiresTwoFactor: true,
      userId: user._id
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
};

exports.verifyTwoFactor = async (req, res) => {
  try {
    const { userId, token } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const isValid = authenticator.verify({ token, secret: user.twoFactorSecret });
    if (!isValid) return res.status(400).json({ error: 'Invalid verification code' });
    
    const { accessToken, refreshToken } = generateTokens(user._id, user.role);
    
    res.json({
      accessToken,
      refreshToken,
      user: user.toSafeObject()
    });
  } catch (err) {
    res.status(500).json({ error: 'Verification failed' });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' });
    
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) return res.status(401).json({ error: 'Invalid refresh token' });
    
    const tokens = generateTokens(user._id, user.role);
    res.json(tokens);
  } catch (err) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};

exports.getMe = async (req, res) => {
  res.json({ user: req.user.toSafeObject ? req.user.toSafeObject() : req.user });
};