const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName:  { type: String, required: true, trim: true },
  email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:  { type: String, required: true, minlength: 6 },

  role: {
    type: String,
    enum: ['admin', 'client', 'team'],
    required: true
  },

  // ── 2FA (required for client & team) ──────────────────────────
  twoFactorSecret:  { type: String, default: null },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorVerified:{ type: Boolean, default: false }, // completed setup

  // ── Team-specific ──────────────────────────────────────────────
  jobTitle:    { type: String, default: null },
  skills:      [{ type: String }],
  payRate:     { type: Number, default: 0 },   // per project rate

  // ── Temporary Admin Access (for team members) ──────────────────
  isTemporaryAdmin:    { type: Boolean, default: false },
  temporaryAdminUntil: { type: Date, default: null },
  permanentAdmin:      { type: Boolean, default: false },

  // ── Client-specific ────────────────────────────────────────────
  company:  { type: String, default: null },
  industry: { type: String, default: null },

  // ── Account Status ─────────────────────────────────────────────
  isActive:    { type: Boolean, default: true },
  isVerified:  { type: Boolean, default: false },
  verifyToken: { type: String, default: null },
  verifyTokenExpiry: { type: Date, default: null },

  // ── Password Reset ─────────────────────────────────────────────
  resetPasswordToken:  { type: String, default: null },
  resetPasswordExpiry: { type: Date, default: null },

  // ── Profile ────────────────────────────────────────────────────
  avatar:    { type: String, default: null },
  phone:     { type: String, default: null },
  timezone:  { type: String, default: 'UTC' },

  lastLoginAt: { type: Date, default: null },
  onboardingComplete: { type: Boolean, default: false }

}, { timestamps: true });

// ── Virtuals ───────────────────────────────────────────────────────
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// ── Check if team member currently has admin rights ────────────────
userSchema.virtual('hasAdminAccess').get(function () {
  if (this.role === 'admin') return true;
  if (this.permanentAdmin) return true;
  if (this.isTemporaryAdmin && this.temporaryAdminUntil && this.temporaryAdminUntil > new Date()) return true;
  return false;
});

userSchema.set('toJSON', { virtuals: true });

// ── Pre-save: hash password ────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Methods ────────────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toSafeObject = function () {
  const obj = this.toJSON();
  delete obj.password;
  delete obj.twoFactorSecret;
  delete obj.verifyToken;
  delete obj.resetPasswordToken;
  return obj;
};

// ── Auto-expire temporary admin ────────────────────────────────────
userSchema.methods.checkAndRevokeTemporaryAdmin = async function () {
  if (this.isTemporaryAdmin && this.temporaryAdminUntil && this.temporaryAdminUntil < new Date()) {
    this.isTemporaryAdmin = false;
    this.temporaryAdminUntil = null;
    await this.save();
  }
};

const User = mongoose.model('User', userSchema);
module.exports = User;