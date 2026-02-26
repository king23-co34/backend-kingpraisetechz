const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  project:   { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  client:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  rating:    { type: Number, required: true, min: 1, max: 5 },
  title:     { type: String, required: true, trim: true },
  content:   { type: String, required: true },

  // Admin approval flow
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  reviewedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt:  { type: Date, default: null },
  adminNote:   { type: String, default: null }, // reason for rejection

  // Displayed on homepage when approved
  displayOnHomepage: { type: Boolean, default: false },
  featured:          { type: Boolean, default: false },

  // Optional: client can attach screenshots
  attachments: [{
    url:  String,
    name: String
  }]

}, { timestamps: true });

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;s