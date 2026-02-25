const express = require('express');
const router = express.Router();
const milestoneController = require('../controllers/milestoneController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate);

router.get('/', milestoneController.getMilestones);
router.post('/', requireAdmin, milestoneController.createMilestone);
router.put('/:id', requireAdmin, milestoneController.updateMilestone);
router.delete('/:id', requireAdmin, milestoneController.deleteMilestone);

module.exports = router;