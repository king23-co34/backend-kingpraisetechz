const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Admin-only middleware
const verifyAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer "))
      return res.status(401).json({ message: "Unauthorized" });

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || user.role !== "admin") return res.status(403).json({ message: "Admins only" });

    req.user = user;
    next();
  } catch (err) {
    console.error("verifyAdmin error:", err);
    res.status(401).json({ message: "Unauthorized" });
  }
};

// General auth middleware
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer "))
      return res.status(401).json({ message: "Unauthorized" });

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    req.user = user;
    next();
  } catch (err) {
    console.error("verifyToken error:", err);
    res.status(401).json({ message: "Unauthorized" });
  }
};

module.exports = { verifyAdmin, verifyToken };