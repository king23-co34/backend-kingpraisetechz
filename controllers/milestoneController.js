const { Milestone } = require('../models/Milestone');

exports.getMilestones = async (req, res) => {
  try {
    const milestones = await Milestone.find().populate('project client createdBy');
    res.json({ milestones });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.createMilestone = async (req, res) => {
  try {
    const milestone = await Milestone.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ milestone });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateMilestone = async (req, res) => {
  try {
    const milestone = await Milestone.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!milestone) return res.status(404).json({ error: 'Milestone not found' });
    res.json({ milestone });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.deleteMilestone = async (req, res) => {
  try {
    const milestone = await Milestone.findByIdAndDelete(req.params.id);
    if (!milestone) return res.status(404).json({ error: 'Milestone not found' });
    res.json({ message: 'Milestone deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};