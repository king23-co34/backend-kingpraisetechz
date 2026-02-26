const Project = require('../models/Project');

exports.getProjects = async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'client') filter.client = req.user._id;
    const projects = await Project.find(filter).populate('client createdBy milestones tasks');
    res.json({ projects });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate('client createdBy milestones tasks');
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json({ project });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.createProject = async (req, res) => {
  try {
    const project = await Project.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ project });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json({ project });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json({ message: 'Project deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const totalProjects = await Project.countDocuments();
    const completedProjects = await Project.countDocuments({ status: 'completed' });
    res.json({ totalProjects, completedProjects });
  } catch (err) { res.status(500).json({ error: err.message }); }
};