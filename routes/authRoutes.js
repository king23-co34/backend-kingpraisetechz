const express = require("express");
const router = express.Router();

const auth = require("../controllers/authController");
const protect = require("../middleware/authMiddleware");

// Public routes
router.post("/register", auth.register);
router.post("/login", auth.login);

// Protected route
router.post("/enable-2fa", protect, auth.enable2FA);

module.exports = router;