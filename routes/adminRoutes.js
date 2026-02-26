// src/routes/adminRoutes.js
const express = require("express");
const router = express.Router();

// 🔹 Import middleware correctly
const { authenticate, requireAdmin } = require("../middleware/authMiddleware");

// 🔹 Import controller functions correctly
const {
  getAdminDashboard,
  getAllUsers,
  createAdminUser,
  deleteUser,
} = require("../controllers/adminController");

// ===========================
// Admin dashboard
// ===========================
router.get("/dashboard", authenticate, requireAdmin, getAdminDashboard);

// ===========================
// List all users
// ===========================
router.get("/users", authenticate, requireAdmin, getAllUsers);

// ===========================
// Create new admin user
// ===========================
router.post("/users", authenticate, requireAdmin, createAdminUser);

// ===========================
// Delete user by ID
// ===========================
router.delete("/users/:id", authenticate, requireAdmin, deleteUser);

module.exports = router;