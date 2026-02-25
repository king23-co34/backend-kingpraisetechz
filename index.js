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

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const teamRoutes = require("./routes/teamRoutes");
const clientRoutes = require("./routes/clientRoutes");
const publicRoutes = require("./routes/publicRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");

connectDB();

const app = express();

// ── Security ──────────────────────────────────────────────
app.use(helmet());
app.use(hpp());

// Input sanitization (Mongo injection + XSS)
const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== "object") return obj;
  const clean = mongoSanitizer.sanitize(obj);
  Object.keys(clean).forEach((key) => {
    if (typeof clean[key] === "string") clean[key] = xss(clean[key]);
    else if (typeof clean[key] === "object") clean[key] = sanitizeObject(clean[key]);
  });
  return clean;
};

app.use((req, res, next) => {
  req.body   = sanitizeObject(req.body)   ?? req.body;
  req.params = sanitizeObject(req.params) ?? req.params;
  req.query  = sanitizeObject(req.query)  ?? req.query;
  next();
});

// ── Logging ───────────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === "development" ? "dev" : "combined"));

// ── Body Parser ───────────────────────────────────────────
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// ── Rate Limiting ─────────────────────────────────────────
app.use(rateLimiter);

// ── CORS ──────────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({ origin: allowedOrigins, credentials: true }));

// ── Socket.io ─────────────────────────────────────────────
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: allowedOrigins, credentials: true },
  transports: ["websocket", "polling"],
});
app.set("io", io);

io.on("connection", (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);
  socket.on("join-room", (room) => socket.join(room));
  socket.on("disconnect", () =>
    console.log(`[Socket] Client disconnected: ${socket.id}`)
  );
});

// ── Routes ────────────────────────────────────────────────
app.use("/api/auth",      authRoutes);
app.use("/api/admin",     adminRoutes);
app.use("/api/team",      teamRoutes);
app.use("/api/client",    clientRoutes);
app.use("/api/public",    publicRoutes);
app.use("/api/analytics", analyticsRoutes);

// ── Health Check ──────────────────────────────────────────
app.get("/", (req, res) =>
  res.json({ status: "ok", message: "KingPraise Techz API is running", timestamp: new Date() })
);

app.get("/health", (req, res) =>
  res.json({ status: "healthy", uptime: process.uptime() })
);

// ── 404 ───────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ success: false, message: "Route not found" }));

// ── Error Handler ─────────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`[Server] Running on port ${PORT} in ${process.env.NODE_ENV} mode`));
