const errorHandler = (err, req, res, next) => {
    console.error('ERROR:', err.stack);
  
    // Mongoose validation
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: 'Validation error', errors });
    }
  
    // Mongoose duplicate key
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(409).json({ success: false, message: `${field} already exists.` });
    }
  
    // Mongoose cast error (bad ID)
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid ID format.' });
    }
  
    // Multer file size error
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'File too large. Max 10MB.' });
    }
  
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
  
    res.status(statusCode).json({ success: false, message });
  };
  
  class AppError extends Error {
    constructor(message, statusCode) {
      super(message);
      this.statusCode = statusCode;
      this.isOperational = true;
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  module.exports = { errorHandler, AppError };