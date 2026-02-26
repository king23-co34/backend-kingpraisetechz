const Task = require('../models/tasks');

exports.createTask = async (req, res) => {
  try {
    const task = await Task.create({ ...req.body, assignedBy: req.user._id });
    res.status(201).json({ task });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getTasks = async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'team') filter.assignedTo = req.user._id;
    if (req.user.role === 'client') filter.createdBy = req.user._id;

    const tasks = await Task.find(filter).populate('assignedTo assignedBy project');
    res.json({ tasks });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate('assignedTo assignedBy project');
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json({ task });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json({ task });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json({ message: 'Task deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};