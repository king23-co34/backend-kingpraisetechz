const jwt = require('jsonwebtoken');
const User = require('../models/users');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select('-password -twoFactorSecret');
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    if (user.isTemporaryAdmin && user.temporaryAdminUntil && new Date() > user.temporaryAdminUntil) {
      await User.findByIdAndUpdate(user._id, { isTemporaryAdmin: false, temporaryAdminUntil: null });
      user.isTemporaryAdmin = false;
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expired' });
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const effectiveRole = req.user.isAdminRole() ? 'admin' : req.user.role;
  if (!roles.includes(effectiveRole)) return res.status(403).json({ error: 'Insufficient permissions' });
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (!req.user.isAdminRole()) return res.status(403).json({ error: 'Admin access required' });
  next();
};

module.exports = { authenticate, requireRole, requireAdmin };