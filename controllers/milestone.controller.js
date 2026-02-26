const Milestone    = require('../models/Milestone.model');
const Project      = require('../models/Project.model');
const User         = require('../models/User.model');
const Notification = require('../models/Notification.model');
const { sendMilestoneEmail, sendMilestoneCompletedEmail } = require('../services/email.service');

// POST /api/milestones
exports.createMilestone = async (req, res) => {
  try {
    const { projectId, title, description, dueDate, order, notes } = req.body;

    const project = await Project.findById(projectId).populate('client');
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

    const milestone = await Milestone.create({
      project:   projectId,
      client:    project.client._id,
      createdBy: req.user._id,
      title, description,
      dueDate: new Date(dueDate),
      order:  order || 0,
      notes
    });

    // Link to project
    project.milestones.push(milestone._id);
    await project.save();

    // Notify client
    await Notification.create({
      recipient:        project.client._id,
      sender:           req.user._id,
      type:             'milestone_created',
      title:            'New Milestone',
      message:          `A new milestone "${title}" has been added to your project "${project.title}"`,
      relatedProject:   projectId,
      relatedMilestone: milestone._id
    });

    // Email client
    const emailResult = await sendMilestoneEmail(project.client, project, milestone);
    if (emailResult.success) {
      milestone.emailSentAt = new Date();
      await milestone.save();
    }

    res.status(201).json({ success: true, message: 'Milestone created and client notified.', data: { milestone } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/milestones?projectId=...
exports.getMilestones = async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!projectId) return res.status(400).json({ success: false, message: 'projectId is required.' });

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

    // Access check
    if (!req.user.hasAdminAccess) {
      if (req.user.role === 'client' && project.client.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
    }

    const milestones = await Milestone.find({ project: projectId })
      .populate('createdBy', 'firstName lastName')
      .sort({ order: 1, dueDate: 1 });

    res.json({ success: true, data: { milestones } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/milestones/:id/status  (admin)
exports.updateMilestoneStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const milestone = await Milestone.findById(req.params.id)
      .populate('project')
      .populate('client');

    if (!milestone) return res.status(404).json({ success: false, message: 'Milestone not found.' });

    milestone.status = status;
    if (notes) milestone.notes = notes;

    if (status === 'completed') {
      milestone.completedAt = new Date();

      // Recalculate project progress
      await milestone.project.recalculateProgress();

      // Notify + email client
      await Notification.create({
        recipient:        milestone.client._id,
        sender:           req.user._id,
        type:             'milestone_completed',
        title:            'Milestone Completed! ✅',
        message:          `Milestone "${milestone.title}" has been completed.`,
        relatedProject:   milestone.project._id,
        relatedMilestone: milestone._id
      });

      sendMilestoneCompletedEmail(milestone.client, milestone.project, milestone).catch(console.error);
    }

    await milestone.save();
    res.json({ success: true, message: 'Milestone updated.', data: { milestone } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/milestones/:id  (admin)
exports.deleteMilestone = async (req, res) => {
  try {
    const milestone = await Milestone.findByIdAndDelete(req.params.id);
    if (!milestone) return res.status(404).json({ success: false, message: 'Milestone not found.' });

    await Project.findByIdAndUpdate(milestone.project, { $pull: { milestones: milestone._id } });

    res.json({ success: true, message: 'Milestone deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};