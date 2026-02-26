const Task = require("../models/tasks");
const Project = require("../models/projects");
const { sendSuccess, sendError } = require("../utils/response");

// @desc  Get my assigned tasks
// @route GET /api/team/tasks
exports.getMyTasks = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = { assignedTo: req.user._id };
    if (status) filter.status = status;

    const tasks = await Task.find(filter)
      .populate("project", "title status")
      .sort("-createdAt");

    sendSuccess(res, { tasks });
  } catch (err) {
    next(err);
  }
};

// @desc  Update task status
// @route PUT /api/team/tasks/:id/status
exports.updateTaskStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const task = await Task.findOne({ _id: req.params.id, assignedTo: req.user._id });

    if (!task) return sendError(res, "Task not found or not assigned to you", 404);

    task.status = status;
    await task.save();

    const io = req.app.get("io");
    io.to(task.project.toString()).emit("task:updated", task);

    sendSuccess(res, { task }, "Task status updated");
  } catch (err) {
    next(err);
  }
};

// @desc  Add comment to task
// @route POST /api/team/tasks/:id/comments
exports.addComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) return sendError(res, "Comment text is required", 400);

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { $push: { comments: { user: req.user._id, text } } },
      { new: true }
    ).populate("comments.user", "name avatar");

    if (!task) return sendError(res, "Task not found", 404);
    sendSuccess(res, { task }, "Comment added");
  } catch (err) {
    next(err);
  }
};

// @desc  Get my projects
// @route GET /api/team/projects
exports.getMyProjects = async (req, res, next) => {
  try {
    const projects = await Project.find({ assignedTeam: req.user._id })
      .populate("client", "name email")
      .sort("-updatedAt");

    sendSuccess(res, { projects });
  } catch (err) {
    next(err);
  }
};
