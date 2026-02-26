const express = require('express');
const router  = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/',                               dashboardController.getDashboard);
router.get('/notifications',                  dashboardController.getMyNotifications);
router.patch('/notifications/:id/read',       dashboardController.markRead);
router.patch('/notifications/read-all',       dashboardController.markAllRead);

module.exports = router;