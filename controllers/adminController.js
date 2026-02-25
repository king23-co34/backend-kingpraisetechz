const User = require("../models/User");
const Project = require("../models/Project");
const Task = require("../models/Task");
const { sendSuccess, sendError } = require("../utils/response");

// @desc  Get all users
// @route GET /api/admin/users
exports.getAllUsers = async (req, res, next) => {
  try {
    const { role, page = 1, limit = 20 } = req.query;
    const filter = role ? { role } : {};
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(filter).skip(skip).limit(Number(limit)).sort("-createdAt"),
      User.countDocuments(filter),
    ]);

    sendSuccess(res, { users, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

// @desc  Create user (admin)
// @route POST /api/admin/users
exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body;
    if (!name || !email || !password) return sendError(res, "Name, email and password are required", 400);

    const exists = await User.findOne({ email });
    if (exists) return sendError(res, "Email already in use", 409);

    const user = await User.create({ name, email, password, role, phone });
    sendSuccess(res, { user }, "User created", 201);
  } catch (err) {
    next(err);
  }
};

// @desc  Update user
// @route PUT /api/admin/users/:id
exports.updateUser = async (req, res, next) => {
  try {
    const { name, email, role, phone, isActive } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, role, phone, isActive },
      { new: true, runValidators: true }
    );
    if (!user) return sendError(res, "User not found", 404);
    sendSuccess(res, { user }, "User updated");
  } catch (err) {
    next(err);
  }
};

// @desc  Delete user
// @route DELETE /api/admin/users/:id
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return sendError(res, "User not found", 404);
    sendSuccess(res, {}, "User deleted");
  } catch (err) {
    next(err);
  }
};

// @desc  Get all projects
// @route GET /api/admin/projects
exports.getAllProjects = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = status ? { status } : {};
    const skip = (page - 1) * limit;

    const [projects, total] = await Promise.all([
      Project.find(filter)
        .populate("client", "name email")
        .populate("assignedTeam", "name email")
        .skip(skip)
        .limit(Number(limit))
        .sort("-createdAt"),
      Project.countDocuments(filter),
    ]);

    sendSuccess(res, { projects, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

// @desc  Create project
// @route POST /api/admin/projects
exports.createProject = async (req, res, next) => {
  try {
    const project = await Project.create(req.body);
    await project.populate("client", "name email");

    const io = req.app.get("io");
    io.emit("project:created", project);

    sendSuccess(res, { project }, "Project created", 201);
  } catch (err) {
    next(err);
  }
};

// @desc  Update project
// @route PUT /api/admin/projects/:id
exports.updateProject = async (req, res, next) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate("client assignedTeam", "name email");

    if (!project) return sendError(res, "Project not found", 404);

    const io = req.app.get("io");
    io.emit("project:updated", project);

    sendSuccess(res, { project }, "Project updated");
  } catch (err) {
    next(err);
  }
};

// @desc  Delete project
// @route DELETE /api/admin/projects/:id
exports.deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return sendError(res, "Project not found", 404);
    await Task.deleteMany({ project: req.params.id });
    sendSuccess(res, {}, "Project and tasks deleted");
  } catch (err) {
    next(err);
  }
};
