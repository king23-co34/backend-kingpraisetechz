const express = require('express');
const router  = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { uploadAvatar }  = require('../middleware/upload.middleware');

// ── Public routes ──────────────────────────────────────────────────
router.post('/register',         authController.register);
router.post('/login',            authController.login);
router.post('/2fa/setup',        authController.setup2FA);
router.post('/2fa/enable',       authController.enable2FA);
router.post('/2fa/verify',       authController.verify2FA);
router.post('/refresh',          authController.refreshToken);
router.post('/forgot-password',  authController.forgotPassword);
router.post('/reset-password',   authController.resetPassword);

// ── Protected routes ───────────────────────────────────────────────
router.get('/me',                    authenticate, authController.getMe);
router.put('/profile',               authenticate, uploadAvatar.single('avatar'), authController.updateProfile);
router.post('/change-password',      authenticate, authController.changePassword);

module.exports = router;