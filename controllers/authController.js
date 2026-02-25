const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const speakeasy = require("speakeasy");

// Seed admin
exports.seedAdmin = async () => {
  const existingAdmin = await User.findOne({ email: "chibuksai@gmail.com" });
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash("Password123", 10);
    await User.create({ name: "Admin", email: "chibuksai@gmail.com", password: hashedPassword, role: "admin" });
    console.log("✅ Admin seeded");
  }
};

// Register client
exports.register = async (req, res) => {
  const { name, email, password } = req.body;
  if (email === "chibuksai@gmail.com") return res.status(403).json({ message: "Cannot register as admin" });

  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ message: "User exists" });

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password: hashedPassword, role: "client" });
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

  res.status(201).json({ token, user: { id: user._id, name, email, role: user.role } });
};

// Login user
exports.login = async (req, res) => {
  const { email, password, twoFactorToken } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: "Invalid credentials" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

  // 2FA check
  if (user.twoFactorSecret) {
    if (!twoFactorToken) return res.status(401).json({ message: "2FA token required" });
    const verified = speakeasy.totp.verify({ secret: user.twoFactorSecret, encoding: "base32", token: twoFactorToken });
    if (!verified) return res.status(401).json({ message: "Invalid 2FA token" });
  }

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
};

// Setup 2FA
exports.setupTwoFactor = async (req, res) => {
  const user = await User.findById(req.user.id);
  const secret = speakeasy.generateSecret({ name: "KingPraise Agency" });
  user.twoFactorTempSecret = secret.base32;
  await user.save();
  res.json({ otpauth_url: secret.otpauth_url, base32: secret.base32 });
};

// Enable 2FA
exports.enableTwoFactor = async (req, res) => {
  const { token } = req.body;
  const user = await User.findById(req.user.id);

  if (!user.twoFactorTempSecret) return res.status(400).json({ message: "2FA not setup" });

  const verified = speakeasy.totp.verify({ secret: user.twoFactorTempSecret, encoding: "base32", token });
  if (!verified) return res.status(400).json({ message: "Invalid token" });

  user.twoFactorSecret = user.twoFactorTempSecret;
  user.twoFactorTempSecret = null;
  await user.save();
  res.json({ message: "2FA enabled successfully" });
};