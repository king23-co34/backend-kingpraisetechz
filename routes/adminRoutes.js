// src/routes/adminRoutes.js
const express = require("express");
const router = express.Router();

// 🔹 Import middleware functions correctly
const { authenticate, requireAdmin } = require("../middleware/authMiddleware");

// 🔹 Import controller functions correctly (named exports)
const {
  getAdminDashboard,
  getAllUsers,
  createAdminUser,
  deleteUser,
} = require("../controllers/adminController");

// ===========================
// Admin Dashboard Route
// ===========================
router.get("/dashboard", authenticate, requireAdmin, getAdminDashboard);

// ===========================
// Get all users (admin only)
// ===========================
router.get("/users", authenticate, requireAdmin, getAllUsers);

// ===========================
// Create a new admin user
// ===========================
router.post("/users", authenticate, requireAdmin, createAdminUser);

// ===========================
// Delete a user by ID
// ===========================
router.delete("/users/:id", authenticate, requireAdmin, deleteUser);

module.exports = router;