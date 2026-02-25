const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");

// Create Admin if not exists
exports.seedAdmin = async () => {
  const adminExists = await User.findOne({ role: "admin" });
  if (adminExists) return;

  const hashed = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);

  await User.create({
    name: "Admin",
    email: process.env.ADMIN_EMAIL,
    password: hashed,
    role: "admin",
  });

  console.log("Admin seeded");
};

// CLIENT REGISTER
exports.register = async (req, res) => {
  const { name, email, password } = req.body;

  const hashed = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email,
    password: hashed,
  });

  res.json({ message: "Client registered" });
};

// LOGIN
exports.login = async (req, res) => {
  const { email, password, token } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: "Invalid credentials" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ message: "Invalid credentials" });

  if (user.twoFactorEnabled) {
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token,
    });

    if (!verified)
      return res.status(400).json({ message: "Invalid 2FA code" });
  }

  const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

  res.json({ token: jwtToken, role: user.role });
};

// ENABLE 2FA
exports.enable2FA = async (req, res) => {
  const secret = speakeasy.generateSecret();

  const user = await User.findById(req.user.id);
  user.twoFactorSecret = secret.base32;
  user.twoFactorEnabled = true;
  await user.save();

  const qr = await QRCode.toDataURL(secret.otpauth_url);

  res.json({ qr });
};