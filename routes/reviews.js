const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticate, requireAdmin } = require('../middleware/authMiddleware');

// Public reviews (no auth needed)
router.get('/public', reviewController.getPublicReviews);

router.use(authenticate);

router.post('/', reviewController.submitReview);
router.get('/', reviewController.getReviews);
router.put('/:id/moderate', requireAdmin, reviewController.moderateReview);

module.exports = router;