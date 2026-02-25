const jwt = require("jsonwebtoken");

exports.generateToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "7d" });

exports.verifyToken = (token) =>
  jwt.verify(token, process.env.JWT_SECRET);
