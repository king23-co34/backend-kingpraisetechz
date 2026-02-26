const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');

router.post('/signup', authController.signup);
router.post('/verify-2fa-setup', authController.verifyAndComplete2FASetup);
router.post('/login', authController.login);
router.post('/verify-2fa', authController.verifyTwoFactor);
router.post('/refresh', authController.refreshToken);
router.get('/me', authenticate, authController.getMe);

module.exports = router;