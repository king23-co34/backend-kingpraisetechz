const Project   = require('../models/Project.model');
const User      = require('../models/User.model');
const Task      = require('../models/Task.model');
const Milestone = require('../models/Milestone.model');
const Notification = require('../models/Notification.model');
const { sendProjectCreatedEmail, sendTaskAssignedEmail } = require('../services/email.service');

// ─────────────────────────────────────────────────────────────────────
// POST /api/projects
// Admin creates a project (assigns to client, creates tasks for team)
// ─────────────────────────────────────────────────────────────────────
exports.createProject = async (req, res) => {
  try {
    const {
      title, description, clientId, budget, currency, deliveryDate,
      startDate, category, tags, internalNotes,
      tasks: taskData = []  // array of task objects to create
    } = req.body;

    // Validate client
    const client = await User.findOne({ _id: clientId, role: 'client' });
    if (!client) return res.status(404).json({ success: false, message: 'Client not found.' });

    const project = await Project.create({
      title, description, client: clientId, createdBy: req.user._id,
      budget, currency: currency || 'USD',
      deliveryDate: new Date(deliveryDate),
      startDate: startDate ? new Date(startDate) : new Date(),
      category, tags, internalNotes
    });

    // ── Create and assign tasks ──────────────────────────────────
    const createdTasks = [];
    for (const t of taskData) {
      const teamMember = await User.findOne({ _id: t.assignedTo, role: 'team' });
      if (!teamMember) continue;

      const task = await Task.create({
        project:     project._id,
        assignedTo:  t.assignedTo,
        assignedBy:  req.user._id,
        title:       t.title,
        description: t.description,
        priority:    t.priority || 'medium',
        dueDate:     new Date(t.dueDate),
        payAmount:   t.payAmount || 0,
        currency:    t.currency || 'USD',
        estimatedHours: t.estimatedHours || 0,
        tags:        t.tags || []
      });

      createdTasks.push(task);
      project.tasks.push(task._id);

      // Notify team member
      await Notification.create({
        recipient:       t.assignedTo,
        sender:          req.user._id,
        type:            'task_assigned',
        title:           'New Task Assigned',
        message:         `You have been assigned the task "${task.title}" for project "${title}"`,
        relatedProject:  project._id,
        relatedTask:     task._id
      });

      // Email team member (async)
      sendTaskAssignedEmail(teamMember, project, task).catch(console.error);
    }

    await project.save();

    // ── Notify client ────────────────────────────────────────────
    await Notification.create({
      recipient:      clientId,
      sender:         req.user._id,
      type:           'project_created',
      title:          'New Project Started',
      message:        `Your project "${title}" has been created and work will begin soon.`,
      relatedProject: project._id
    });

    sendProjectCreatedEmail(client, project).catch(console.error);

    const populated = await Project.findById(project._id)
      .populate('client', 'firstName lastName email company')
      .populate('tasks')
      .populate('createdBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Project created successfully.',
      data: { project: populated, tasksCreated: createdTasks.length }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────
// GET /api/projects  (admin: all | client: their own | team: assigned)
// ─────────────────────────────────────────────────────────────────────
exports.getProjects = async (req, res) => {
  try {
    const { status, page = 1, limit = 10, search } = req.query;
    const skip = (page - 1) * limit;

    let query = { isArchived: false };

    if (req.user.hasAdminAccess) {
      // Admin sees all
      if (status) query.status = status;
      if (search) query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    } else if (req.user.role === 'client') {
      query.client = req.user._id;
      if (status) query.status = status;
    } else if (req.user.role === 'team') {
      // Team sees projects where they have tasks
      const taskProjects = await Task.distinct('project', { assignedTo: req.user._id });
      query._id = { $in: taskProjects };
    }

    const [projects, total] = await Promise.all([
      Project.find(query)
        .populate('client', 'firstName lastName email company avatar')
        .populate('createdBy', 'firstName lastName')
        .populate({ path: 'milestones', select: 'title status dueDate order' })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Project.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        projects,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────
// GET /api/projects/:id
// ─────────────────────────────────────────────────────────────────────
exports.getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('client', 'firstName lastName email company phone avatar')
      .populate('createdBy', 'firstName lastName')
      .populate({ path: 'milestones', populate: { path: 'createdBy', select: 'firstName lastName' }})
      .populate({ path: 'tasks', populate: [
        { path: 'assignedTo', select: 'firstName lastName email avatar jobTitle' },
        { path: 'assignedBy', select: 'firstName lastName' }
      ]})
      .populate('review');

    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

    // Access control
    if (!req.user.hasAdminAccess) {
      if (req.user.role === 'client' && project.client._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
      if (req.user.role === 'team') {
        const hasTask = await Task.findOne({ project: project._id, assignedTo: req.user._id });
        if (!hasTask) return res.status(403).json({ success: false, message: 'Access denied.' });
      }
    }

    // Filter internal notes for non-admins
    if (!req.user.hasAdminAccess) {
      project.internalNotes = undefined;
    }

    res.json({ success: true, data: { project } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────
// PATCH /api/projects/:id  (admin only)
// ─────────────────────────────────────────────────────────────────────
exports.updateProject = async (req, res) => {
  try {
    const { title, description, budget, deliveryDate, status, category, tags, internalNotes, progress } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

    if (title)        project.title        = title;
    if (description)  project.description  = description;
    if (budget)       project.budget       = budget;
    if (deliveryDate) project.deliveryDate = new Date(deliveryDate);
    if (status)       project.status       = status;
    if (category)     project.category     = category;
    if (tags)         project.tags         = tags;
    if (internalNotes !== undefined) project.internalNotes = internalNotes;
    if (progress !== undefined)      project.progress = progress;

    await project.save();

    // Notify client of update
    await Notification.create({
      recipient:      project.client,
      sender:         req.user._id,
      type:           'project_updated',
      title:          'Project Updated',
      message:        `Your project "${project.title}" has been updated.`,
      relatedProject: project._id
    });

    const updated = await Project.findById(project._id)
      .populate('client', 'firstName lastName email')
      .populate('milestones')
      .populate('tasks');

    res.json({ success: true, message: 'Project updated.', data: { project: updated } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────
// POST /api/projects/:id/upload  (admin)
// Upload attachment to project
// ─────────────────────────────────────────────────────────────────────
exports.uploadAttachment = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

    project.attachments.push({
      name:       req.file.originalname,
      url:        req.file.path,
      publicId:   req.file.filename,
      uploadedBy: req.user._id
    });

    await project.save();
    res.json({ success: true, message: 'Attachment uploaded.', data: { attachments: project.attachments } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────
// DELETE /api/projects/:id  (admin)
// ─────────────────────────────────────────────────────────────────────
exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

    project.isArchived = true;
    await project.save();

    res.json({ success: true, message: 'Project archived.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};