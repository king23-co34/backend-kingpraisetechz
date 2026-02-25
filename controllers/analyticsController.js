const Task = require("../models/Task");
const User = require("../models/User");
const Project = require("../models/Project");
const { sendSuccess } = require("../utils/response");

// @desc  Dashboard stats
// @route GET /api/analytics/dashboard
exports.dashboardStats = async (req, res, next) => {
  try {
    const [totalClients, totalTeam, totalProjects, completedProjects, totalTasks, completedTasks] =
      await Promise.all([
        User.countDocuments({ role: "CLIENT" }),
        User.countDocuments({ role: "TEAM" }),
        Project.countDocuments(),
        Project.countDocuments({ progress: 100 }),
        Task.countDocuments(),
        Task.countDocuments({ status: "Completed" }),
      ]);

    sendSuccess(res, {
      stats: {
        totalClients,
        totalTeam,
        totalProjects,
        completedProjects,
        totalTasks,
        completedTasks,
        projectCompletionRate: totalProjects
          ? Math.round((completedProjects / totalProjects) * 100)
          : 0,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc  Team performance
// @route GET /api/analytics/team-performance
exports.teamPerformance = async (req, res, next) => {
  try {
    const performance = await Task.aggregate([
      { $match: { status: "Completed" } },
      {
        $group: {
          _id: "$assignedTo",
          totalCompleted: { $sum: 1 },
          avgCompletionDays: {
            $avg: {
              $divide: [
                { $subtract: ["$completedAt", "$createdAt"] },
                1000 * 60 * 60 * 24,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          name: "$user.name",
          email: "$user.email",
          totalCompleted: 1,
          avgCompletionDays: { $round: ["$avgCompletionDays", 1] },
        },
      },
      { $sort: { totalCompleted: -1 } },
    ]);

    sendSuccess(res, { performance });
  } catch (err) {
    next(err);
  }
};

// @desc  Project progress overview
// @route GET /api/analytics/projects
exports.projectsOverview = async (req, res, next) => {
  try {
    const projects = await Project.find({})
      .select("title status progress dueDate client")
      .populate("client", "name")
      .sort("-updatedAt")
      .limit(20);

    const byStatus = await Project.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    sendSuccess(res, { projects, byStatus });
  } catch (err) {
    next(err);
  }
};
