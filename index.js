require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const clientRoutes = require('./routes/client.routes');
const teamRoutes = require('./routes/team.routes');
const projectRoutes = require('./routes/projects.routes');
const reviewRoutes = require('./routes/reviews.routes');
const milestoneRoutes = require('./routes/milestone.routes');
const taskRoutes = require('./routes/tasks.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

const { errorHandler } = require('./middleware/error.middleware');
const { seedAdmin } = require('./utils/seed');
const { startAdminExpiryJob } = require('./utils/cron');

const app = express();

/* ─── Environment Validation ────────────────────────────────────── */
if (!process.env.MONGO_URI) {
  console.error('❌ MONGO_URI is not defined in environment variables.');
  process.exit(1);
}

/* ─── Security Middleware ───────────────────────────────────────── */
app.use(helmet());

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

/* ─── Rate Limiting ────────────────────────────────────────────── */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many auth attempts, please try again later.' }
});

app.use(globalLimiter);

/* ─── Body Parsing & Logging ───────────────────────────────────── */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

/* ─── Routes ───────────────────────────────────────────────────── */
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/client', clientRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/milestones', milestoneRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/dashboard', dashboardRoutes);

/* ─── Base Route (Optional Homepage) ───────────────────────────── */
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'King Praise Techz Backend API is live 🚀',
    documentation: '/api/health'
  });
});

/* ─── Health Check ─────────────────────────────────────────────── */
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

/* ─── 404 Handler ──────────────────────────────────────────────── */
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

/* ─── Global Error Handler ─────────────────────────────────────── */
app.use(errorHandler);

/* ─── Database Connection ─────────────────────────────────────── */
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected successfully');

    await seedAdmin();
    startAdminExpiryJob();

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

/* ─── Start Server ────────────────────────────────────────────── */
const PORT = process.env.PORT;

if (!PORT) {
  console.error('❌ Render PORT environment variable is missing!');
  process.exit(1);
}

const startServer = async () => {
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'production'}`);
    console.log(`📡 Health check: ${process.env.BASE_URL || 'https://your-backend-url.onrender.com'}/api/health`);
  });

  // Graceful Shutdown
  process.on('SIGINT', async () => {
    console.log('🛑 Shutting down server...');
    await mongoose.connection.close();
    server.close(() => {
      console.log('💤 Server closed gracefully');
      process.exit(0);
    });
  });
};

startServer();

module.exports = app;
