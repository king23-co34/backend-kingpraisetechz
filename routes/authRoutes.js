const router = require("express").Router();
const auth = require("../controllers/authController");
const protect = require("../middleware/authMiddleware");

router.post("/register", auth.register);
router.post("/login", auth.login);
router.post("/enable-2fa", protect, auth.enable2FA);

module.exports = router;