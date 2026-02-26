const express = require('express');
const router  = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate, adminOnly } = require('../middleware/auth.middleware');

router.use(authenticate, adminOnly);

router.get('/users',                         adminController.getAllUsers);
router.get('/users/:id',                     adminController.getUserById);
router.patch('/users/:id/toggle-active',     adminController.toggleUserActive);

router.post('/grant-admin',                  adminController.grantAdminAccess);
router.post('/revoke-admin',                 adminController.revokeAdminAccess);

router.get('/stats',                         adminController.getStats);

router.get('/notifications',                 adminController.getNotifications);
router.patch('/notifications/:id/read',      adminController.markNotificationRead);
router.patch('/notifications/read-all',      adminController.markAllNotificationsRead);

module.exports = router;