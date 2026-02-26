// src/index.js
require("dotenv").config(); // Load .env locally
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const morgan = require("morgan"); // Optional: logging
const cookieParser = require("cookie-parser");

// ===== Import routes =====
const authRoutes = require("./routes/auth");
const projectRoutes = require("./routes/projects");
const reviewRoutes = require("./routes/reviews");
const taskRoutes = require("./routes/tasks");
const adminRoutes = require("./routes/adminRoutes");

// ===== Import seeder =====
const { seedAdmin } = require("./controllers/authController");

const app = express();

// ===== Middleware =====
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev")); // logs requests to console

// ===== Routes =====
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/admin", adminRoutes);

// ===== Root Route =====
app.get("/", (req, res) => res.send("API is running"));

// ===== MongoDB Connection =====
const mongoURI = process.env.MONGO_URI || "mongodb://localhost:27017/kingpraisetechz";

mongoose
  .connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("✅ MongoDB connected");

    // Seed admin if not exists
    try {
      await seedAdmin();
      console.log("✅ Admin seed complete");
    } catch (err) {
      console.error("❌ Admin seed failed:", err.message);
    }

    // Start server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`🚀 King Praise Techz Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1); // Exit app if DB connection fails
  });