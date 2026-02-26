const User         = require('../models/User.model');
const Project      = require('../models/Project.model');
const Task         = require('../models/Task.model');
const Milestone    = require('../models/Milestone.model');
const Review       = require('../models/Review.model');
const Notification = require('../models/Notification.model');

// ─────────────────────────────────────────────────────────────────────
// GET /api/dashboard
// Returns role-customized dashboard data
// ─────────────────────────────────────────────────────────────────────
exports.getDashboard = async (req, res) => {
  try {
    const user  = req.user;
    const role  = user.hasAdminAccess ? 'admin' : user.role;

    let dashboardData = { role, user: user.toSafeObject() };

    // ── ADMIN DASHBOARD ────────────────────────────────────────────
    if (role === 'admin') {
      const [
        totalClients, totalTeam, totalProjects,
        projectsByStatus, pendingReviews, pendingTaskSubmissions,
        recentProjects, recentTasks, teamWithElevatedAccess,
        unreadNotifications
      ] = await Promise.all([
        User.countDocuments({ role: 'client', isActive: true }),
        User.countDocuments({ role: 'team', isActive: true }),
        Project.countDocuments({ isArchived: false }),
        Project.aggregate([{ $match: { isArchived: false } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
        Review.countDocuments({ status: 'pending' }),
        Task.countDocuments({ status: 'review' }),
        Project.find({ isArchived: false })
          .populate('client', 'firstName lastName email avatar company')
          .select('title status progress budget deliveryDate createdAt')
          .sort({ createdAt: -1 }).limit(8),
        Task.find({ status: 'review' })
          .populate('assignedTo', 'firstName lastName avatar')
          .populate('project', 'title')
          .sort({ updatedAt: -1 }).limit(5),
        User.find({ role: 'team', $or: [{ isTemporaryAdmin: true }, { permanentAdmin: true }] })
          .select('firstName lastName email isTemporaryAdmin permanentAdmin temporaryAdminUntil'),
        Notification.countDocuments({ recipient: user._id, isRead: false })
      ]);

      const statusMap = projectsByStatus.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {});

      const revenueAgg = await Project.aggregate([
        { $match: { isArchived: false } },
        { $group: { _id: null, totalBudget: { $sum: '$budget' }, completedRevenue: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$budget', 0] }
        }}}
      ]);

      dashboardData.admin = {
        stats: {
          totalClients,
          totalTeam,
          totalProjects,
          pendingReviews,
          pendingTaskSubmissions,
          unreadNotifications,
          projectsByStatus: statusMap,
          revenue: revenueAgg[0] || { totalBudget: 0, completedRevenue: 0 }
        },
        recentProjects,
        pendingTaskReviews: recentTasks,
        teamWithElevatedAccess,
        quickActions: [
          { label: 'Create Project', action: 'create_project', icon: 'folder-plus' },
          { label: 'Add Client',     action: 'add_client',     icon: 'user-plus' },
          { label: 'Add Team Member',action: 'add_team',       icon: 'users' },
          { label: 'Review Ratings', action: 'review_ratings', icon: 'star' }
        ]
      };
    }

    // ── CLIENT DASHBOARD ───────────────────────────────────────────
    else if (role === 'client') {
      const [
        projects, notifications, unreadCount
      ] = await Promise.all([
        Project.find({ client: user._id, isArchived: false })
          .populate({ path: 'milestones', select: 'title status dueDate order completedAt' })
          .populate('review')
          .select('title status progress budget deliveryDate startDate milestones review category')
          .sort({ createdAt: -1 }),
        Notification.find({ recipient: user._id })
          .populate('sender', 'firstName lastName')
          .sort({ createdAt: -1 }).limit(10),
        Notification.countDocuments({ recipient: user._id, isRead: false })
      ]);

      const activeProject    = projects.find(p => p.status === 'in_progress');
      const completedProjects = projects.filter(p => p.status === 'completed').length;

      // Upcoming milestones
      const upcomingMilestones = await Milestone.find({
        client: user._id,
        status: { $in: ['pending', 'in_progress'] },
        dueDate: { $gte: new Date() }
      }).populate('project', 'title').sort({ dueDate: 1 }).limit(5);

      dashboardData.client = {
        stats: {
          totalProjects:     projects.length,
          activeProjects:    projects.filter(p => p.status === 'in_progress').length,
          completedProjects,
          pendingReview:     projects.filter(p => p.status === 'completed' && !p.review).length,
          unreadNotifications: unreadCount
        },
        projects,
        activeProject: activeProject || null,
        upcomingMilestones,
        notifications,
        quickActions: [
          { label: 'Track Progress', action: 'track_progress', icon: 'activity' },
          { label: 'View Milestones',action: 'milestones',     icon: 'flag' },
          { label: 'Submit Review',  action: 'submit_review',  icon: 'star' }
        ]
      };
    }

    // ── TEAM DASHBOARD ─────────────────────────────────────────────
    else if (role === 'team') {
      const [
        myTasks, completedTasks, notifications, unreadCount
      ] = await Promise.all([
        Task.find({ assignedTo: user._id, status: { $nin: ['completed'] } })
          .populate('project', 'title status deliveryDate')
          .sort({ dueDate: 1 }),
        Task.find({ assignedTo: user._id, status: 'completed' })
          .populate('project', 'title')
          .sort({ completedAt: -1 }).limit(5),
        Notification.find({ recipient: user._id })
          .populate('sender', 'firstName lastName')
          .sort({ createdAt: -1 }).limit(10),
        Notification.countDocuments({ recipient: user._id, isRead: false })
      ]);

      // Earnings calculation
      const earningsAgg = await Task.aggregate([
        { $match: { assignedTo: user._id } },
        { $group: {
          _id: null,
          totalEarnings: { $sum: '$payAmount' },
          pendingEarnings: { $sum: { $cond: [{ $ne: ['$status', 'completed'] }, '$payAmount', 0] } },
          earnedSoFar: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$payAmount', 0] } }
        }}
      ]);

      const tasksByPriority = myTasks.reduce((acc, t) => {
        acc[t.priority] = (acc[t.priority] || 0) + 1;
        return acc;
      }, {});

      const overdueTasks = myTasks.filter(t => new Date(t.dueDate) < new Date() && t.status !== 'completed');

      // Projects where team member has tasks
      const projectIds = [...new Set(myTasks.map(t => t.project?._id?.toString()).filter(Boolean))];

      dashboardData.team = {
        stats: {
          totalAssignedTasks: myTasks.length,
          completedTasksCount: completedTasks.length,
          overdueTasks:        overdueTasks.length,
          tasksByPriority,
          unreadNotifications: unreadCount,
          earnings: earningsAgg[0] || { totalEarnings: 0, pendingEarnings: 0, earnedSoFar: 0 }
        },
        activeTasks:    myTasks.filter(t => ['todo', 'in_progress'].includes(t.status)),
        reviewTasks:    myTasks.filter(t => t.status === 'review'),
        completedTasks,
        overdueTasks,
        notifications,
        quickActions: [
          { label: 'My Tasks',      action: 'my_tasks',     icon: 'check-square' },
          { label: 'Submit Work',   action: 'submit_work',  icon: 'upload' },
          { label: 'My Earnings',   action: 'earnings',     icon: 'dollar-sign' }
        ]
      };
    }

    res.json({ success: true, data: dashboardData });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/dashboard/notifications
exports.getMyNotifications = async (req, res) => {
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

// PATCH /api/dashboard/notifications/:id/read
exports.markRead = async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true, readAt: new Date() }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/dashboard/notifications/read-all
exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true, readAt: new Date() });
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};