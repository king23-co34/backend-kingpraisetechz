const express = require("express");
const router = express.Router();
const {
  getAllUsers, createUser, updateUser, deleteUser,
  getAllProjects, createProject, updateProject, deleteProject,
} = require("../controllers/adminController");
const { protect, authorise } = require("../middleware/authMiddleware");

router.use(protect, authorise("ADMIN"));

// Users
router.get("/users", getAllUsers);
router.post("/users", createUser);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

// Projects
router.get("/projects", getAllProjects);
router.post("/projects", createProject);
router.put("/projects/:id", updateProject);
router.delete("/projects/:id", deleteProject);

module.exports = router;
