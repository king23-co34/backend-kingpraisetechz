const express = require("express");
const router = express.Router();
const { getMyProjects, getProjectDetails } = require("../controllers/clientController");
const { protect, authorise } = require("../middleware/authMiddleware");

router.use(protect, authorise("CLIENT", "ADMIN"));

router.get("/projects", getMyProjects);
router.get("/projects/:id", getProjectDetails);

module.exports = router;
