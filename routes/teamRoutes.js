const express = require("express");
const router = express.Router();
const { getMyTasks, updateTaskStatus, addComment, getMyProjects } = require("../controllers/teamController");
const { protect, authorise } = require("../middleware/authMiddleware");

router.use(protect, authorise("TEAM", "ADMIN"));

router.get("/tasks", getMyTasks);
router.put("/tasks/:id/status", updateTaskStatus);
router.post("/tasks/:id/comments", addComment);
router.get("/projects", getMyProjects);

module.exports = router;
