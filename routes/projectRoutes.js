const router = require("express").Router();
const protect = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const project = require("../controllers/projectController");

router.post("/upload", protect, role("admin"), project.uploadProject);
router.put("/progress", protect, role("admin"), project.updateProgress);

module.exports = router;