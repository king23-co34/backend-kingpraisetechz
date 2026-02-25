require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const authRoutes = require("./routes/authRoutes");
const projectRoutes = require("./routes/projectRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const adminRoutes = require("./routes/adminRoutes"); // ✅ Added admin routes

const { seedAdmin } = require("./controllers/authController");

const app = express();

/* ========================================
   GLOBAL MIDDLEWARE
======================================== */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ========================================
   DATABASE CONNECTION
======================================== */
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected");

    // Seed Admin After DB Connects
    await seedAdmin();
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
    process.exit(1);
  }
};

connectDB();

/* ========================================
   ROUTES
======================================== */
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/admin", adminRoutes); // ✅ Added this line

/* ========================================
   HEALTH CHECK ROUTE
======================================== */
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "KingPraise Agency Backend Running 🚀",
  });
});

/* ========================================
   404 HANDLER
======================================== */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

/* ========================================
   GLOBAL ERROR HANDLER
======================================== */
app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err.stack);

  res.status(500).json({
    success: false,
    message: "Something went wrong",
  });
});

/* ========================================
   SERVER START
======================================== */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});