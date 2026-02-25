const express = require("express");
const router = express.Router();
const { register, login, setupTwoFactor, enableTwoFactor } = require("../controllers/authController");
const { verifyToken } = require("../middleware/authMiddleware");

// POST /api/auth/register
router.post("/register", register);

// POST /api/auth/login
router.post("/login", login);

// 2FA routes (requires auth)
router.post("/2fa/setup", verifyToken, setupTwoFactor);
router.post("/2fa/enable", verifyToken, enableTwoFactor);

module.exports = router;