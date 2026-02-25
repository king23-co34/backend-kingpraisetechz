const express = require("express");
const router = express.Router();
const { getInfo } = require("../controllers/publicController");

router.get("/info", getInfo);

module.exports = router;
