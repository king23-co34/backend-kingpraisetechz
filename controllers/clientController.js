const Project = require("../models/projects");
const Task = require("../models/tasks");
const { sendSuccess, sendError } = require("../utils/response");

// @desc  Get my projects
// @route GET /api/client/projects
exports.getMyProjects = async (req, res, next) => {
  try {
    const projects = await Project.find({ client: req.user._id })
      .populate("assignedTeam", "name email avatar")
      .sort("-createdAt");

    sendSuccess(res, { projects });
  } catch (err) {
    next(err);
  }
};

// @desc  Get single project details
// @route GET /api/client/projects/:id
exports.getProjectDetails = async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, client: req.user._id })
      .populate("assignedTeam", "name email avatar");

    if (!project) return sendError(res, "Project not found", 404);

    const tasks = await Task.find({ project: project._id })
      .populate("assignedTo", "name avatar")
      .sort("priority");

    sendSuccess(res, { project, tasks });
  } catch (err) {
    next(err);
  }
};
