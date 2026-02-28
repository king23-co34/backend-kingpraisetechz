// index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const http = require("http");
const { Server } = require("socket.io");
const morgan = require("morgan");
const hpp = require("hpp");
const mongoSanitizer = require("mongo-sanitizer");
const xss = require("xss");

const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorMiddleware");
const rateLimiter = require("./middleware/rateLimiter");

// ==========================
// Routes
// ==========================
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const teamRoutes = require("./routes/teamRoutes");
const clientRoutes = require("./routes/clientRoutes");
const publicRoutes = require("./routes/publicRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");

// ==========================
// Connect Database
// ==========================
connectDB();

const app = express();

// ==========================
// Security Middleware
// ==========================
app.use(helmet());
app.use(hpp());

// Sanitize inputs (body, params, query)
app.use((req, res, next) => {
  const sanitizeObject = (obj) => {
    if (!obj) return obj;
    Object.keys(obj).forEach((key) => {
      if (typeof obj[key] === "string") {
        obj[key] = xss(obj[key]); // XSS sanitization
      } else if (typeof obj[key] === "object") {
        obj[key] = sanitizeObject(obj[key]);
      }
    });
    return obj;
  };

  req.body = mongoSanitizer.sanitize(req.body);
  req.params = mongoSanitizer.sanitize(req.params);
  req.query = mongoSanitizer.sanitize(req.query);

  req.body = sanitizeObject(req.body);
  req.params = sanitizeObject(req.params);
  req.query = sanitizeObject(req.query);

  next();
});

// ==========================
// Logging
// ==========================
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// ==========================
// Body Parser + Rate Limiting
// ==========================
app.use(express.json());
app.use(rateLimiter);

// ==========================
// CORS (allow local + production frontend)
// ==========================
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  process.env.FRONTEND_URL, // your deployed frontend
].filter(Boolean); // remove undefined if FRONTEND_URL not set

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow Postman / mobile apps (no origin)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Handle preflight OPTIONS requests globally
app.options("*", cors());

// ==========================
// HTTP Server + Socket.io
// ==========================
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  },
});
app.set("io", io);

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  socket.on("disconnect", () => console.log("Client disconnected:", socket.id));
});

// ==========================
// API Routes
// ==========================
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/team", teamRoutes);
app.use("/api/client", clientRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/analytics", analyticsRoutes);

// ==========================
// Health Check
// ==========================
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Backend is running!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// ==========================
// Error Handling Middleware
// ==========================
app.use(errorHandler);

// ==========================
// Start Server
// ==========================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`)
);

module.exports = app;
