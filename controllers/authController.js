const User = require("../models/User");
const { generateToken } = require("../utils/jwt");
const { sendSuccess, sendError } = require("../utils/response");

// @desc  Register a new user
// @route POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body;

    if (!name || !email || !password) {
      return sendError(res, "Name, email, and password are required", 400);
    }

    const exists = await User.findOne({ email });
    if (exists) return sendError(res, "Email already registered", 409);

    // Only allow ADMIN to create ADMIN accounts
    const assignedRole = role && req.user?.role === "ADMIN" ? role : "CLIENT";

    const user = await User.create({ name, email, password, role: assignedRole, phone });
    const token = generateToken(user._id, user.role);

    sendSuccess(res, { token, user }, "Account created successfully", 201);
  } catch (err) {
    next(err);
  }
};

// @desc  Login
// @route POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, "Email and password are required", 400);
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.matchPassword(password))) {
      return sendError(res, "Invalid email or password", 401);
    }

    if (!user.isActive) {
      return sendError(res, "Account is deactivated. Contact support.", 403);
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id, user.role);
    sendSuccess(res, { token, user }, "Login successful");
  } catch (err) {
    next(err);
  }
};

// @desc  Get current user
// @route GET /api/auth/me
exports.getMe = async (req, res) => {
  sendSuccess(res, { user: req.user });
};

// @desc  Update profile
// @route PUT /api/auth/profile
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, avatar } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone, avatar },
      { new: true, runValidators: true }
    );
    sendSuccess(res, { user }, "Profile updated");
  } catch (err) {
    next(err);
  }
};

// @desc  Change password
// @route PUT /api/auth/change-password
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return sendError(res, "Both current and new passwords are required", 400);
    }

    const user = await User.findById(req.user._id).select("+password");
    if (!(await user.matchPassword(currentPassword))) {
      return sendError(res, "Current password is incorrect", 401);
    }

    user.password = newPassword;
    await user.save();

    const token = generateToken(user._id, user.role);
    sendSuccess(res, { token }, "Password changed successfully");
  } catch (err) {
    next(err);
  }
};
