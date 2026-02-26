const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);

// Get team member's earnings summary
router.get('/earnings', authorize('team'), async (req, res) => {
  const Task = require('../models/Task.model');
  try {
    const tasks = await Task.find({ assignedTo: req.user._id })
      .populate('project', 'title status')
      .select('title status payAmount currency completedAt isPaid project');

    const summary = {
      totalEarnings:   tasks.reduce((s, t) => s + t.payAmount, 0),
      earnedSoFar:     tasks.filter(t => t.status === 'completed').reduce((s, t) => s + t.payAmount, 0),
      pendingEarnings: tasks.filter(t => t.status !== 'completed').reduce((s, t) => s + t.payAmount, 0),
      paidOut:         tasks.filter(t => t.isPaid).reduce((s, t) => s + t.payAmount, 0),
      taskBreakdown:   tasks
    };

    res.json({ success: true, data: { summary } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get team member profile (public — admin can see this)
router.get('/profile/:id', async (req, res) => {
  const User = require('../models/User.model');
  const Task = require('../models/Task.model');
  try {
    const user = await User.findOne({ _id: req.params.id, role: 'team' })
      .select('firstName lastName email avatar jobTitle skills createdAt');
    if (!user) return res.status(404).json({ success: false, message: 'Team member not found.' });

    const taskCount = await Task.countDocuments({ assignedTo: user._id, status: 'completed' });
    res.json({ success: true, data: { user, completedTasks: taskCount } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;