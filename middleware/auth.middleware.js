const { verifyAccessToken } = require('../utils/jwt.utils');
const User = require('../models/User.model');

// ── Verify JWT and attach user to request ─────────────────────────
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided. Access denied.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ success: false, message: 'User not found.' });
    if (!user.isActive) return res.status(403).json({ success: false, message: 'Account is deactivated.' });

    // Auto-check temporary admin expiry
    await user.checkAndRevokeTemporaryAdmin();

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired. Please login again.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

// ── Role-based access control ─────────────────────────────────────
const authorize = (...roles) => {
  return (req, res, next) => {
    const userRole = req.user.role;
    const hasAdminAccess = req.user.hasAdminAccess;

    // If 'admin' is in allowed roles, also allow team members with admin access
    if (roles.includes('admin') && hasAdminAccess) return next();

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Requires one of: [${roles.join(', ')}]. Your role: ${userRole}.`
      });
    }
    next();
  };
};

// ── Admin-only middleware (including elevated team members) ────────
const adminOnly = async (req, res, next) => {
  if (!req.user.hasAdminAccess) {
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }
  next();
};

// ── 2FA check — ensures 2FA is verified for this session ──────────
const require2FA = (req, res, next) => {
  // Admin bypasses 2FA
  if (req.user.role === 'admin' && !req.user.isTemporaryAdmin) return next();

  if (!req.user.twoFactorEnabled) {
    return res.status(403).json({
      success: false,
      message: '2FA setup required.',
      code: 'SETUP_2FA_REQUIRED'
    });
  }

  // The JWT already being valid means 2FA was verified at login time
  next();
};

module.exports = { authenticate, authorize, adminOnly, require2FA };