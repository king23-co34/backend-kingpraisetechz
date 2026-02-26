const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 8 },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  role: { type: String, enum: ['admin', 'client', 'team'], required: true },
  isTemporaryAdmin: { type: Boolean, default: false },
  temporaryAdminUntil: { type: Date },
  temporaryAdminGrantedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  twoFactorSecret: { type: String },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorVerified: { type: Boolean, default: false },
  avatar: { type: String },
  phone: { type: String },
  company: { type: String },
  position: { type: String },
  bio: { type: String },
  isActive: { type: Boolean, default: true },
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String },
  passwordResetToken: { type: String },
  passwordResetExpires: { type: Date },
  notifications: [{
    message: String,
    type: { type: String, enum: ['info', 'success', 'warning', 'error'] },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }],
  lastLogin: { type: Date }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.isAdminRole = function() {
  if (this.role === 'admin') return true;
  if (this.isTemporaryAdmin && this.temporaryAdminUntil && new Date() < this.temporaryAdminUntil) return true;
  return false;
};

userSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.twoFactorSecret;
  delete obj.passwordResetToken;
  delete obj.emailVerificationToken;
  return obj;
};

module.exports = mongoose.model('User', userSchema);