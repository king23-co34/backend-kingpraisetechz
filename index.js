require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

// ─── Route Imports ───────────────────────────────────────────
const authRoutes = require("./routes/auth.routes");
const adminRoutes = require("./routes/admin.routes");
const clientRoutes = require("./routes/client.routes");
const teamRoutes = require("./routes/team.routes");
const projectRoutes = require("./routes/projects.routes");
const reviewRoutes = require("./routes/reviews.routes");
const milestoneRoutes = require("./routes/milestone.routes");
const taskRoutes = require("./routes/tasks.routes");
const dashboardRoutes = require("./routes/dashboard.routes");

// ─── Utilities ───────────────────────────────────────────────
const { errorHandler } = require("./middleware/error.middleware");
const { seedAdmin } = require("./utils/seed");
const { startAdminExpiryJob } = require("./utils/cron");

const app = express();

// ============================================================
// 🔐 SECURITY MIDDLEWARE
// ============================================================

// Helmet (secure headers)
app.use(
  helmet({
    crossOriginResourcePolicy: false, // important for API usage
  })
);

// ------------------------------------------------------------
// 🔥 PRODUCTION-SAFE CORS CONFIGURATION
// ------------------------------------------------------------
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  process.env.FRONTEND_URL, // e.g. https://your-frontend.vercel.app
].filter(Boolean);

// Reliable CORS middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type,Authorization"
    );
    res.setHeader("Access-Control-Allow-Credentials", "true");
  } else {
    // Optional: log unauthorized origin attempt
    console.warn(`Blocked CORS request from origin: ${origin}`);
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(204); // Preflight handled
  }

  next();
});

// ============================================================
// 🚦 RATE LIMITING
// ============================================================
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again later.",
  },
});

app.use(globalLimiter);

// ============================================================
// 📦 BODY PARSING & LOGGING
// ============================================================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// ============================================================
// 🚀 ROUTES
// ============================================================
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/client", clientRoutes);
app.use("/api/team", teamRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/milestones", milestoneRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/dashboard", dashboardRoutes);

// ============================================================
// ❤️ HEALTH CHECK
// ============================================================
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// ============================================================
// ❌ 404 HANDLER
// ============================================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// ============================================================
// 🛑 GLOBAL ERROR HANDLER
// ============================================================
app.use(errorHandler);

// ============================================================
// 🗄 DATABASE CONNECTION
// ============================================================
const connectDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI ||
        "mongodb+srv://pauluduogwu_db_user:6GPYfzehVR9IoHyu@cluster2.0fytaso.mongodb.net/?appName=Cluster2",
      { autoIndex: false }
    );

    console.log("✅ MongoDB connected successfully");

    await seedAdmin();
    startAdminExpiryJob();
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

// ============================================================
// ▶ START SERVER
// ============================================================
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(
      `🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`
    );
    console.log(
      `📡 API Base URL: ${process.env.BACKEND_URL || `http://localhost:${PORT}`}/api`
    );
  });
});

module.exports = app;
