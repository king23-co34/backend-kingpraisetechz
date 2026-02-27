const User         = require('../models/User.model');
const Project      = require('../models/Project.model');
const Task         = require('../models/Task.model');
const Review       = require('../models/Review.model');
const Notification = require('../models/Notification.model');
const { sendAdminAccessEmail } = require('../services/email.service');

// GET /api/admin/users  — list all users by role
exports.getAllUsers = async (req, res) => {
  try {
    const { role, page = 1, limit = 20, search } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (role)   query.role  = role;
    if (search) query.$or   = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName:  { $regex: search, $options: 'i' } },
      { email:     { $regex: search, $options: 'i' } }
    ];

    const [users, total] = await Promise.all([
      User.find(query).select('-password -twoFactorSecret -verifyToken -resetPasswordToken')
        .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      User.countDocuments(query)
    ]);

    res.json({ success: true, data: { users, pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) } } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/users/:id
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -twoFactorSecret');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, data: { user } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/admin/users/:id/toggle-active  — activate / deactivate user
exports.toggleUserActive = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    if (user.role === 'admin') return res.status(403).json({ success: false, message: 'Cannot deactivate admin.' });

    user.isActive = !user.isActive;
    await user.save();

    res.json({ success: true, message: `User ${user.isActive ? 'activated' : 'deactivated'}.`, data: { isActive: user.isActive } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/admin/grant-admin  — grant team member admin access
exports.grantAdminAccess = async (req, res) => {
  try {
    const { userId, isPermanent = false, expiryDate } = req.body;

    const teamMember = await User.findOne({ _id: userId, role: 'team' });
    if (!teamMember) return res.status(404).json({ success: false, message: 'Team member not found.' });

    if (isPermanent) {
      teamMember.permanentAdmin      = true;
      teamMember.isTemporaryAdmin    = false;
      teamMember.temporaryAdminUntil = null;
    } else {
      if (!expiryDate) return res.status(400).json({ success: false, message: 'expiryDate is required for temporary admin.' });
      const expiry = new Date(expiryDate);
      if (expiry < new Date()) return res.status(400).json({ success: false, message: 'expiryDate must be in the future.' });

      teamMember.isTemporaryAdmin    = true;
      teamMember.temporaryAdminUntil = expiry;
      teamMember.permanentAdmin      = false;
    }

    await teamMember.save();

    await Notification.create({
      recipient: userId, sender: req.user._id,
      type: 'admin_access_granted',
      title: '🔐 Admin Access Granted',
      message: `You've been granted ${isPermanent ? 'permanent' : 'temporary'} admin access.`
    });

    sendAdminAccessEmail(teamMember, isPermanent, expiryDate).catch(console.error);

    res.json({
      success: true,
      message: `Admin access granted ${isPermanent ? 'permanently' : `until ${new Date(expiryDate).toLocaleDateString()}`}.`,
      data: { user: teamMember.toSafeObject() }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/admin/revoke-admin  — revoke admin access
exports.revokeAdminAccess = async (req, res) => {
  try {
    const { userId } = req.body;
    const teamMember = await User.findOne({ _id: userId, role: 'team' });
    if (!teamMember) return res.status(404).json({ success: false, message: 'Team member not found.' });

    teamMember.isTemporaryAdmin    = false;
    teamMember.temporaryAdminUntil = null;
    teamMember.permanentAdmin      = false;
    await teamMember.save();

    await Notification.create({
      recipient: userId, sender: req.user._id,
      type: 'admin_access_revoked',
      title: 'Admin Access Revoked',
      message: 'Your admin access has been revoked. Your dashboard has returned to team view.'
    });

    res.json({ success: true, message: 'Admin access revoked.', data: { user: teamMember.toSafeObject() } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/stats  — overview stats
exports.getStats = async (req, res) => {
  try {
    const [
      totalClients, totalTeam, totalProjects, activeProjects,
      completedProjects, pendingReviews, pendingTasks
    ] = await Promise.all([
      User.countDocuments({ role: 'client', isActive: true }),
      User.countDocuments({ role: 'team', isActive: true }),
      Project.countDocuments({ isArchived: false }),
      Project.countDocuments({ status: 'in_progress', isArchived: false }),
      Project.countDocuments({ status: 'completed', isArchived: false }),
      Review.countDocuments({ status: 'pending' }),
      Task.countDocuments({ status: 'review' })
    ]);

    // Revenue stats
    const revenueData = await Project.aggregate([
      { $match: { isArchived: false } },
      { $group: { _id: '$status', totalBudget: { $sum: '$budget' } } }
    ]);

    const revenue = revenueData.reduce((acc, item) => {
      acc[item._id] = item.totalBudget;
      return acc;
    }, {});

    // Recent activity
    const recentProjects = await Project.find({ isArchived: false })
      .populate('client', 'firstName lastName')
      .select('title status progress createdAt deliveryDate')
      .sort({ createdAt: -1 }).limit(5);

    res.json({
      success: true,
      data: {
        overview: { totalClients, totalTeam, totalProjects, activeProjects, completedProjects, pendingReviews, pendingTasks },
        revenue,
        recentProjects
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/notifications  — admin's notifications
exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const skip = (page - 1) * limit;

    let query = { recipient: req.user._id };
    if (unreadOnly === 'true') query.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query).populate('sender', 'firstName lastName avatar')
        .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Notification.countDocuments(query),
      Notification.countDocuments({ recipient: req.user._id, isRead: false })
    ]);

    res.json({ success: true, data: { notifications, unreadCount, pagination: { total, page: Number(page), totalPages: Math.ceil(total / limit) } } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/admin/notifications/:id/read
exports.markNotificationRead = async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true, readAt: new Date() }
    );
    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/admin/notifications/read-all
exports.markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};