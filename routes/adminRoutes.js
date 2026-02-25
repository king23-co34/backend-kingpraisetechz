const express = require("express");
const router = express.Router();

const { getOverview } = require("../controllers/adminController");
const { verifyAdmin } = require("../middleware/authMiddleware");

// GET /api/admin/overview
router.get("/overview", verifyAdmin, getOverview);

module.exports = router;