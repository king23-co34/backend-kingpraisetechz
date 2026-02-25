const express = require("express");
const router = express.Router();
const { register, login, setupTwoFactor, enableTwoFactor } = require("../controllers/authController");
const { verifyToken } = require("../middleware/authMiddleware");

router.post("/register", register);
router.post("/login", login);
router.post("/2fa/setup", verifyToken, setupTwoFactor);
router.post("/2fa/enable", verifyToken, enableTwoFactor);

module.exports = router;