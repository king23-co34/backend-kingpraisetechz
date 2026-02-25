const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');

exports.createProject = async (req, res) => {
  try {
    const {
      title, description, clientId, budget, deliveryDate,
      startDate, category, tags, tasks: taskData
    } = req.body;
    
    const client = await User.findOne({ _id: clientId, role: 'client' });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    
    const project = new Project({
      title,
      description,
      client: clientId,
      createdBy: req.user._id,
      budget: { amount: budget.amount, currency: budget.currency || 'USD' },
      deliveryDate: new Date(deliveryDate),
      startDate: startDate ? new Date(startDate) : undefined,
      category,
      tags
    });
    
    await project.save();
    
    // Create tasks if provided
    if (taskData && taskData.length > 0) {
      const createdTasks = await Promise.all(taskData.map(async (t) => {
        const task = new Task({
          title: t.title,
          description: t.description,
          project: project._id,
          assignedTo: t.assignedTo,
          assignedBy: req.user._id,
          payment: { amount: t.payment },
          priority: t.priority || 'medium',
          dueDate: t.dueDate ? new Date(t.dueDate) : undefined
        });
        return task.save();
      }));
      
      project.tasks = createdTasks.map(t => t._id);
      await project.save();
    }
    
    const populated = await Project.findById(project._id)
      .populate('client', 'firstName lastName email company')
      .populate('tasks')
      .populate('createdBy', 'firstName lastName');
    
    // Add notification to client
    await User.findByIdAndUpdate(clientId, {
      $push: {
        notifications: {
          message: `New project "${title}" has been created for you.`,
          type: 'info'
        }
      }
    });
    
    res.status(201).json({ project: populated });
  } catch (err) {
    console.error('Create project error:', err);
    res.status(500).json({ error: 'Failed to create project' });
  }
};

exports.getProjects = async (req, res) => {
  try {
    let query = {};
    const user = req.user;
    
    if (user.role === 'client') {
      query.client = user._id;
    } else if (user.role === 'team' && !user.isAdminRole()) {
      // Team sees projects they have tasks in
      const tasks = await Task.find({ assignedTo: user._id }).distinct('project');
      query._id = { $in: tasks };
    }
    // Admin sees all
    
    const projects = await Project.find(query)
      .populate('client', 'firstName lastName email company avatar')
      .populate('createdBy', 'firstName lastName')
      .populate({ path: 'tasks', populate: { path: 'assignedTo', select: 'firstName lastName avatar' } })
      .sort({ createdAt: -1 });
    
    res.json({ projects });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
};

exports.getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('client', 'firstName lastName email company avatar phone')
      .populate('createdBy', 'firstName lastName email')
      .populate({
        path: 'tasks',
        populate: { path: 'assignedTo assignedBy', select: 'firstName lastName avatar email' }
      })
      .populate({ path: 'milestones' });
    
    if (!project) return res.status(404).json({ error: 'Project not found' });
    
    // Access control
    if (req.user.role === 'client' && project.client._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({ project });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch project' });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const { status, progress, ...updates } = req.body;
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { ...updates, ...(status && { status }), ...(progress !== undefined && { progress }) },
      { new: true, runValidators: true }
    ).populate('client', 'firstName lastName email');
    
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json({ project });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update project' });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    await Project.findByIdAndDelete(req.params.id);
    await Task.deleteMany({ project: req.params.id });
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete project' });
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const user = req.user;
    
    if (user.isAdminRole() || user.role === 'admin') {
      const [totalProjects, activeProjects, totalClients, totalTeam, pendingReviews] = await Promise.all([
        Project.countDocuments(),
        Project.countDocuments({ status: 'in-progress' }),
        User.countDocuments({ role: 'client' }),
        User.countDocuments({ role: 'team' }),
        require('../models/Milestone').Review
          ? require('../models/Milestone').Review.countDocuments({ status: 'pending' })
          : 0
      ]);
      
      const recentProjects = await Project.find()
        .sort({ createdAt: -1 }).limit(5)
        .populate('client', 'firstName lastName');
      
      return res.json({ totalProjects, activeProjects, totalClients, totalTeam, pendingReviews, recentProjects });
    }
    
    if (user.role === 'client') {
      const projects = await Project.find({ client: user._id })
        .populate('milestones').sort({ createdAt: -1 });
      
      return res.json({ projects });
    }
    
    if (user.role === 'team') {
      const tasks = await Task.find({ assignedTo: user._id })
        .populate('project', 'title status deliveryDate')
        .sort({ createdAt: -1 });
      
      const totalEarnings = tasks.reduce((acc, t) => acc + (t.payment?.amount || 0), 0);
      const paidEarnings = tasks.filter(t => t.payment?.paid).reduce((acc, t) => acc + (t.payment?.amount || 0), 0);
      
      return res.json({ tasks, totalEarnings, paidEarnings });
    }
    
    res.json({});
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};