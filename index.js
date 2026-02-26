// index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");

// Import routes
const authRoutes = require("./routes/authRoutes");
const projectRoutes = require("./routes/projectRoutes");
const taskRoutes = require("./routes/tasks");

// Import admin seeding utility
const { seedAdmin } = require("./controllers/authController");

// Initialize Express app
const app = express();

// ===============================
// MIDDLEWARE
// ===============================
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());

// ===============================
// ROUTES
// ===============================
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);

// Health check
app.get("/", (req, res) => res.send("🚀 API is running"));

// ===============================
// MONGODB CONNECTION
// ===============================
const mongoURI = process.env.MONGO_URI || "mongodb://localhost:27017/kingpraisetechz";

// Optional: suppress strict query warnings
mongoose.set("strictQuery", false);

mongoose
  .connect(mongoURI)
  .then(async () => {
    console.log("✅ MongoDB connected");

    // Seed admin if not exists
    try {
      await seedAdmin();
      console.log("✅ Admin seed complete");
    } catch (err) {
      console.error("❌ Admin seed failed:", err.message);
    }

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

// ===============================
// GLOBAL ERROR HANDLER
// ===============================
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: err.message || "Server Error" });
});