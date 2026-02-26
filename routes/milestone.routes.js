const express = require('express');
const router  = express.Router();
const milestoneController = require('../controllers/milestone.controller');
const { authenticate, adminOnly } = require('../middleware/auth.middleware');

router.use(authenticate);

router.post('/',                     adminOnly, milestoneController.createMilestone);
router.get('/',                                 milestoneController.getMilestones);
router.patch('/:id/status', adminOnly,          milestoneController.updateMilestoneStatus);
router.delete('/:id',       adminOnly,          milestoneController.deleteMilestone);

module.exports = router;