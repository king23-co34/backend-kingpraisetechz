const express = require('express');
const router  = express.Router();
const reviewController = require('../controllers/review.controller');
const { authenticate, adminOnly, authorize } = require('../middleware/auth.middleware');
const { uploadProject } = require('../middleware/upload.middleware');

// Public — no auth needed (homepage)
router.get('/public', reviewController.getPublicReviews);

router.use(authenticate);

router.post('/',                    authorize('client'), uploadProject.array('attachments', 3), reviewController.submitReview);
router.get('/',                                          reviewController.getReviews);
router.patch('/:id/approve',        adminOnly,           reviewController.approveReview);
router.patch('/:id/reject',         adminOnly,           reviewController.rejectReview);

module.exports = router;