const { Review } = require('../models/Milestone');
const Project = require('../models/Project');

exports.submitReview = async (req, res) => {
  try {
    const { projectId, rating, title, body } = req.body;
    
    const project = await Project.findOne({ _id: projectId, client: req.user._id });
    if (!project) return res.status(404).json({ error: 'Project not found or access denied' });
    if (project.status !== 'completed') {
      return res.status(400).json({ error: 'Reviews can only be submitted for completed projects' });
    }
    
    const existing = await Review.findOne({ project: projectId, client: req.user._id });
    if (existing) return res.status(409).json({ error: 'Review already submitted for this project' });
    
    const review = new Review({
      project: projectId,
      client: req.user._id,
      rating,
      title,
      body
    });
    
    await review.save();
    res.status(201).json({ review, message: 'Review submitted. Awaiting admin approval.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit review' });
  }
};

exports.getReviews = async (req, res) => {
  try {
    const { status, projectId } = req.query;
    let query = {};
    
    if (req.user.role === 'client') {
      query.client = req.user._id;
    } else if (status) {
      query.status = status;
    }
    
    if (projectId) query.project = projectId;
    
    const reviews = await Review.find(query)
      .populate('project', 'title')
      .populate('client', 'firstName lastName avatar company')
      .populate('reviewedBy', 'firstName lastName')
      .sort({ createdAt: -1 });
    
    res.json({ reviews });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
};

exports.getPublicReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ status: 'approved', displayOnHomepage: true })
      .populate('client', 'firstName lastName avatar company')
      .populate('project', 'title')
      .sort({ createdAt: -1 })
      .limit(20);
    
    res.json({ reviews });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
};

exports.moderateReview = async (req, res) => {
  try {
    const { status, displayOnHomepage } = req.body;
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      {
        status,
        displayOnHomepage: status === 'approved' ? (displayOnHomepage !== false) : false,
        reviewedBy: req.user._id,
        reviewedAt: new Date()
      },
      { new: true }
    ).populate('client', 'firstName lastName');
    
    if (!review) return res.status(404).json({ error: 'Review not found' });
    res.json({ review });
  } catch (err) {
    res.status(500).json({ error: 'Failed to moderate review' });
  }
};