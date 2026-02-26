const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Client-specific routes (dashboard is handled in dashboard.routes.js)
// Most client interactions go through /api/projects, /api/reviews, /api/milestones

router.use(authenticate);

// Get client's own projects — shortcut route
router.get('/projects', authorize('client'), async (req, res) => {
  const Project = require('../models/Project.model');
  try {
    const projects = await Project.find({ client: req.user._id, isArchived: false })
      .populate({ path: 'milestones', select: 'title status dueDate order' })
      .populate('review')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: { projects } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;