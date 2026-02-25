const express = require("express");
const router = express.Router();
const { getOverview } = require("../controllers/adminController");
const { verifyAdmin } = require("../middleware/authMiddleware");

router.get("/overview", verifyAdmin, getOverview);

module.exports = router;