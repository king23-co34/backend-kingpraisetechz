// src/controllers/adminController.js
const User = require("../models/User"); // Match exact casing

// ===========================
// Admin Dashboard Overview
// ===========================
const getAdminDashboard = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const admins = await User.countDocuments({ role: "admin" });
    const clients = await User.countDocuments({ role: "client" });
    const teams = await User.countDocuments({ role: "team" });

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        admins,
        clients,
        teams,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ===========================
// Get all users
// ===========================
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ===========================
// Create a new admin user
// ===========================
const createAdminUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const newUser = await User.create({
      name,
      email,
      password,
      role: "admin",
      isActive: true,
    });
    res.status(201).json({ success: true, user: newUser });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ===========================
// Delete a user by ID
// ===========================
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    res.status(200).json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 🔹 Named exports — must match route imports exactly
module.exports = {
  getAdminDashboard,
  getAllUsers,
  createAdminUser,
  deleteUser,
};