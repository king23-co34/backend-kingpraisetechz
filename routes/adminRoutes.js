const express = require('express');
const router = express.Router();
const { getOverview } = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/authMiddleware');

// Add getOverview as the route handler after the middleware
router.get('/overview', requireAdmin, getOverview);

module.exports = router;
