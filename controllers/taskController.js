const Task = require("../models/Task");

/**
 * ===============================
 * CREATE TASK
 * ===============================
 * Admin or Client creates a task
 */
exports.createTask = async (req, res) => {
  try {
    const { title, description, project, assignedTo, status, dueDate } = req.body;

    const task = await Task.create({
      title,
      description,
      project,
      assignedTo,
      status: status || "pending",
      dueDate,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Task created successfully",
      task,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create task",
      error: error.message,
    });
  }
};

/**
 * ===============================
 * GET ALL TASKS
 * ===============================
 * Admin → all tasks
 * Team → only assigned tasks
 * Client → tasks for their projects
 */
exports.getTasks = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === "team") {
      filter.assignedTo = req.user._id;
    }

    if (req.user.role === "client") {
      filter.createdBy = req.user._id;
    }

    const tasks = await Task.find(filter)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      tasks,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch tasks",
      error: error.message,
    });
  }
};

/**
 * ===============================
 * GET SINGLE TASK
 * ===============================
 */
exports.getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email");

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    res.status(200).json({
      success: true,
      task,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch task",
      error: error.message,
    });
  }
};

/**
 * ===============================
 * UPDATE TASK
 * ===============================
 */
exports.updateTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Task updated successfully",
      task,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update task",
      error: error.message,
    });
  }
};

/**
 * ===============================
 * DELETE TASK
 * ===============================
 */
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete task",
      error: error.message,
    });
  }
};