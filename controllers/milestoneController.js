const { Milestone } = require('../models/Milestone');
const Project = require('../models/Project');
const User = require('../models/User');
const { sendEmail } = require('../services/email');

exports.createMilestone = async (req, res) => {
  try {
    const { projectId, title, description, dueDate, status, order } = req.body;
    
    const project = await Project.findById(projectId).populate('client', 'firstName lastName email');
    if (!project) return res.status(404).json({ error: 'Project not found' });
    
    const milestone = new Milestone({
      title,
      description,
      project: projectId,
      client: project.client._id,
      createdBy: req.user._id,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      status: status || 'upcoming',
      order: order || 0
    });
    
    await milestone.save();
    
    // Add to project
    await Project.findByIdAndUpdate(projectId, {
      $push: { milestones: milestone._id }
    });
    
    // Notify client via email
    const clientEmail = await sendEmail({
      to: project.client.email,
      template: 'milestoneUpdate',
      data: [
        `${project.client.firstName} ${project.client.lastName}`,
        project.title,
        title,
        description || 'No description provided',
        status || 'upcoming'
      ]
    });
    
    await Milestone.findByIdAndUpdate(milestone._id, { emailSent: clientEmail.success });
    
    // In-app notification for client
    await User.findByIdAndUpdate(project.client._id, {
      $push: {
        notifications: {
          message: `New milestone "${title}" added to your project "${project.title}".`,
          type: 'info'
        }
      }
    });
    
    res.status(201).json({ milestone });
  } catch (err) {
    console.error('Create milestone error:', err);
    res.status(500).json({ error: 'Failed to create milestone' });
  }
};

exports.getMilestones = async (req, res) => {
  try {
    let query = {};
    if (req.query.project) query.project = req.query.project;
    if (req.user.role === 'client') query.client = req.user._id;
    
    const milestones = await Milestone.find(query)
      .populate('project', 'title')
      .populate('createdBy', 'firstName lastName')
      .sort({ order: 1, createdAt: -1 });
    
    res.json({ milestones });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch milestones' });
  }
};

exports.updateMilestone = async (req, res) => {
  try {
    const milestone = await Milestone.findByIdAndUpdate(
      req.params.id,
      { ...req.body, ...(req.body.status === 'completed' && { completedAt: new Date() }) },
      { new: true }
    );
    if (!milestone) return res.status(404).json({ error: 'Milestone not found' });
    res.json({ milestone });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update milestone' });
  }
};

exports.deleteMilestone = async (req, res) => {
  try {
    const milestone = await Milestone.findByIdAndDelete(req.params.id);
    if (!milestone) return res.status(404).json({ error: 'Milestone not found' });
    await Project.findByIdAndUpdate(milestone.project, {
      $pull: { milestones: milestone._id }
    });
    res.json({ message: 'Milestone deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete milestone' });
  }
};