const express = require("express");
const router = express.Router();
const { dashboardStats, teamPerformance, projectsOverview } = require("../controllers/analyticsController");
const { protect, authorise } = require("../middleware/authMiddleware");

router.use(protect, authorise("ADMIN"));

router.get("/dashboard", dashboardStats);
router.get("/team-performance", teamPerformance);
router.get("/projects", projectsOverview);

module.exports = router;
