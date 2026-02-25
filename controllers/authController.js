const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");

// ===============================
// 1. SEED ADMIN USER
// ===============================
exports.seedAdmin = async () => {
  try {
    const existingAdmin = await User.findOne({ role: "admin" });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || "Password123", 10);
      await User.create({
        name: "Admin",
        email: process.env.ADMIN_EMAIL || "chibuksai@gmail.com",
        password: hashedPassword,
        role: "admin",
      });
      console.log("✅ Admin seeded");
    }
  } catch (err) {
    console.error("❌ Error seeding admin:", err);
  }
};

// ===============================
// 2. REGISTER CLIENT
// ===============================
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Prevent registration as admin
    if (email === (process.env.ADMIN_EMAIL || "chibuksai@gmail.com")) {
      return res.status(403).json({ message: "Cannot register as admin" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "client",
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({ token, user: { id: user._id, name, email, role: user.role } });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// 3. LOGIN (WITH OPTIONAL 2FA)
// ===============================
exports.login = async (req, res) => {
  try {
    const { email, password, token: twoFactorToken } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // If 2FA enabled, verify token
    if (user.twoFactorEnabled) {
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: "base32",
        token: twoFactorToken,
      });

      if (!verified) return res.status(400).json({ message: "Invalid 2FA code" });
    }

    const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({ token: jwtToken, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// 4. ENABLE 2FA
// ===============================
exports.enable2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const secret = speakeasy.generateSecret();
    user.twoFactorSecret = secret.base32;
    user.twoFactorEnabled = true;
    await user.save();

    const qr = await QRCode.toDataURL(secret.otpauth_url);

    res.json({ qr });
  } catch (err) {
    console.error("Enable 2FA error:", err);
    res.status(500).json({ message: "Server error" });
  }
};