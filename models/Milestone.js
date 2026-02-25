const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  dueDate: { type: Date },
  completedAt: { type: Date },
  
  status: {
    type: String,
    enum: ['upcoming', 'in-progress', 'completed', 'delayed'],
    default: 'upcoming'
  },
  
  order: { type: Number, default: 0 },
  
  attachments: [{
    name: String,
    url: String,
    type: String
  }],
  
  emailSent: { type: Boolean, default: false }
}, { timestamps: true });

const reviewSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String },
  body: { type: String, required: true },
  
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  
  displayOnHomepage: { type: Boolean, default: false }
}, { timestamps: true });

const Milestone = mongoose.model('Milestone', milestoneSchema);
const Review = mongoose.model('Review', reviewSchema);

module.exports = { Milestone, Review };