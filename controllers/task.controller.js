const Task         = require('../models/Task.model');
const Project      = require('../models/Project.model');
const User         = require('../models/User.model');
const Notification = require('../models/Notification.model');
const { sendTaskAssignedEmail, sendTaskSubmissionEmail } = require('../services/email.service');

// GET /api/tasks?projectId=... or ?assignedTo=...
exports.getTasks = async (req, res) => {
  try {
    const { projectId, status, priority } = req.query;
    let query = {};

    if (req.user.hasAdminAccess) {
      if (projectId) query.project = projectId;
      if (status)    query.status  = status;
      if (priority)  query.priority = priority;
    } else if (req.user.role === 'team') {
      query.assignedTo = req.user._id;
      if (projectId) query.project = projectId;
      if (status)    query.status  = status;
    } else {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const tasks = await Task.find(query)
      .populate('project', 'title status deliveryDate')
      .populate('assignedTo', 'firstName lastName email avatar jobTitle')
      .populate('assignedBy', 'firstName lastName')
      .populate('reviewedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: { tasks, count: tasks.length } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/tasks/:id
exports.getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('project', 'title status client')
      .populate('assignedTo', 'firstName lastName email avatar')
      .populate('assignedBy', 'firstName lastName');

    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });

    // Access check
    if (!req.user.hasAdminAccess) {
      if (req.user.role !== 'team' || task.assignedTo._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
    }

    res.json({ success: true, data: { task } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/tasks  (admin)
exports.createTask = async (req, res) => {
  try {
    const { projectId, assignedTo, title, description, priority, dueDate, payAmount, currency, estimatedHours, tags, milestoneId } = req.body;

    const [project, teamMember] = await Promise.all([
      Project.findById(projectId),
      User.findOne({ _id: assignedTo, role: 'team' })
    ]);

    if (!project)    return res.status(404).json({ success: false, message: 'Project not found.' });
    if (!teamMember) return res.status(404).json({ success: false, message: 'Team member not found.' });

    const task = await Task.create({
      project: projectId, assignedTo, assignedBy: req.user._id,
      milestone: milestoneId || null,
      title, description, priority, dueDate: new Date(dueDate),
      payAmount: payAmount || 0, currency: currency || 'USD',
      estimatedHours: estimatedHours || 0, tags: tags || []
    });

    project.tasks.push(task._id);
    await project.save();

    await Notification.create({
      recipient: assignedTo, sender: req.user._id,
      type: 'task_assigned',
      title: 'New Task Assigned',
      message: `You've been assigned "${title}" in project "${project.title}"`,
      relatedProject: projectId, relatedTask: task._id
    });

    sendTaskAssignedEmail(teamMember, project, task).catch(console.error);

    res.status(201).json({ success: true, message: 'Task created.', data: { task } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/tasks/:id/status  (team: mark in_progress | admin: all statuses)
exports.updateTaskStatus = async (req, res) => {
  try {
    const { status, adminFeedback } = req.body;
    const task = await Task.findById(req.params.id).populate('assignedTo').populate('project');
    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });

    // Team can only move to 'in_progress' (submit is separate)
    if (req.user.role === 'team' && !req.user.hasAdminAccess) {
      if (!['in_progress'].includes(status)) {
        return res.status(403).json({ success: false, message: 'Team members can only update status to in_progress.' });
      }
    }

    task.status = status;

    if (status === 'completed') task.completedAt = new Date();

    if (adminFeedback && req.user.hasAdminAccess) {
      task.adminFeedback = adminFeedback;
      task.reviewedAt    = new Date();
      task.reviewedBy    = req.user._id;

      // Notify team member
      await Notification.create({
        recipient: task.assignedTo._id, sender: req.user._id,
        type: status === 'completed' ? 'task_approved' : 'task_rejected',
        title: status === 'completed' ? 'Task Approved ✅' : 'Task Needs Revision',
        message: `Your task "${task.title}" has been ${status === 'completed' ? 'approved' : 'rejected'}.`,
        relatedTask: task._id, relatedProject: task.project._id
      });
    }

    await task.save();
    res.json({ success: true, message: 'Task status updated.', data: { task } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/tasks/:id/submit  (team member submits completed work)
exports.submitTask = async (req, res) => {
  try {
    const { note } = req.body;
    const task = await Task.findById(req.params.id)
      .populate('assignedTo')
      .populate('project');

    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });

    // Only the assigned team member
    if (task.assignedTo._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only submit your own tasks.' });
    }

    const submission = { note, submittedAt: new Date() };
    if (req.file) {
      submission.fileUrl      = req.file.path;
      submission.filePublicId = req.file.filename;
      submission.fileName     = req.file.originalname;
    }

    task.submissions.push(submission);
    task.status = 'review';
    await task.save();

    // Find admin to notify (admin email: chibuksai@gmail.com)
    const admin = await User.findOne({ email: process.env.ADMIN_EMAIL || 'chibuksai@gmail.com' });
    if (admin) {
      await Notification.create({
        recipient: admin._id, sender: req.user._id,
        type: 'task_submitted',
        title: 'Task Submitted for Review 📥',
        message: `${req.user.fullName} submitted task "${task.title}" for project "${task.project.title}"`,
        relatedTask: task._id, relatedProject: task.project._id
      });

      sendTaskSubmissionEmail(admin, req.user, task.project, task).catch(console.error);
    }

    res.json({ success: true, message: 'Task submitted for review.', data: { task } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/tasks/:id  (admin)
exports.updateTask = async (req, res) => {
  try {
    const { title, description, priority, dueDate, payAmount, estimatedHours, actualHours } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });

    if (title)          task.title          = title;
    if (description)    task.description    = description;
    if (priority)       task.priority       = priority;
    if (dueDate)        task.dueDate        = new Date(dueDate);
    if (payAmount)      task.payAmount      = payAmount;
    if (estimatedHours) task.estimatedHours = estimatedHours;
    if (actualHours)    task.actualHours    = actualHours;

    await task.save();
    res.json({ success: true, message: 'Task updated.', data: { task } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/tasks/:id (admin)
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });

    await Project.findByIdAndUpdate(task.project, { $pull: { tasks: task._id } });

    res.json({ success: true, message: 'Task deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};