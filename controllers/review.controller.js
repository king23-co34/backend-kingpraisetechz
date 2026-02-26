const Review       = require('../models/Review.model');
const Project      = require('../models/Project.model');
const Notification = require('../models/Notification.model');
const { sendReviewApprovedEmail } = require('../services/email.service');

// POST /api/reviews  (client submits review for completed project)
exports.submitReview = async (req, res) => {
  try {
    const { projectId, rating, title, content } = req.body;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

    // Only the assigned client
    if (project.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only review your own projects.' });
    }

    if (project.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'You can only review completed projects.' });
    }

    if (project.review) {
      return res.status(409).json({ success: false, message: 'You have already submitted a review for this project.' });
    }

    const attachments = req.files ? req.files.map(f => ({ url: f.path, name: f.originalname })) : [];

    const review = await Review.create({
      project: projectId, client: req.user._id,
      rating, title, content, attachments
    });

    project.review = review._id;
    await project.save();

    // Notify admin
    const admin = await require('../models/User.model').findOne({ role: 'admin' });
    if (admin) {
      await Notification.create({
        recipient: admin._id, sender: req.user._id,
        type: 'review_submitted',
        title: 'New Review Pending Approval ⭐',
        message: `${req.user.fullName} submitted a ${rating}-star review for "${project.title}"`,
        relatedProject: projectId
      });
    }

    res.status(201).json({ success: true, message: 'Review submitted. Awaiting admin approval.', data: { review } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/reviews  (admin: all | public: approved only)
exports.getReviews = async (req, res) => {
  try {
    const { status, page = 1, limit = 10, featured } = req.query;
    const skip = (page - 1) * limit;

    let query = {};

    if (req.user?.hasAdminAccess) {
      if (status) query.status = status;
    } else {
      // Public / client view — only approved
      query.status = 'approved';
      query.displayOnHomepage = true;
    }

    if (featured) query.featured = true;

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .populate('client', 'firstName lastName avatar company')
        .populate('project', 'title category')
        .sort({ createdAt: -1 })
        .skip(skip).limit(Number(limit)),
      Review.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        reviews,
        pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/reviews/public  (no auth — for homepage display)
exports.getPublicReviews = async (req, res) => {
  try {
    const { limit = 6 } = req.query;
    const reviews = await Review.find({ status: 'approved', displayOnHomepage: true })
      .populate('client', 'firstName lastName avatar company')
      .populate('project', 'title category')
      .sort({ featured: -1, createdAt: -1 })
      .limit(Number(limit));

    res.json({ success: true, data: { reviews } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/reviews/:id/approve  (admin)
exports.approveReview = async (req, res) => {
  try {
    const { displayOnHomepage = true, featured = false } = req.body;

    const review = await Review.findById(req.params.id).populate('client').populate('project');
    if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });

    review.status            = 'approved';
    review.displayOnHomepage = displayOnHomepage;
    review.featured          = featured;
    review.reviewedBy        = req.user._id;
    review.reviewedAt        = new Date();
    await review.save();

    // Notify client
    await Notification.create({
      recipient: review.client._id, sender: req.user._id,
      type: 'review_approved',
      title: 'Your Review is Live! ⭐',
      message: `Your review for "${review.project.title}" has been approved.`,
      relatedProject: review.project._id
    });

    sendReviewApprovedEmail(review.client, review, review.project).catch(console.error);

    res.json({ success: true, message: 'Review approved and published.', data: { review } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/reviews/:id/reject  (admin)
exports.rejectReview = async (req, res) => {
  try {
    const { adminNote } = req.body;
    const review = await Review.findById(req.params.id).populate('client').populate('project');
    if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });

    review.status     = 'rejected';
    review.adminNote  = adminNote || null;
    review.reviewedBy = req.user._id;
    review.reviewedAt = new Date();
    await review.save();

    await Notification.create({
      recipient: review.client._id, sender: req.user._id,
      type: 'review_rejected',
      title: 'Review Update',
      message: `Your review for "${review.project.title}" requires some changes.${adminNote ? ` Note: ${adminNote}` : ''}`,
      relatedProject: review.project._id
    });

    res.json({ success: true, message: 'Review rejected.', data: { review } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};