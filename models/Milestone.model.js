const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
  project:     { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  client:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  title:       { type: String, required: true },
  description: { type: String, required: true },

  dueDate:     { type: Date, required: true },
  completedAt: { type: Date, default: null },

  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'delayed'],
    default: 'pending'
  },

  order: { type: Number, default: 0 }, // for ordering milestones

  // Email notification sent?
  emailSentAt: { type: Date, default: null },

  attachments: [{
    name:     String,
    url:      String,
    publicId: String
  }],

  notes: { type: String, default: '' }

}, { timestamps: true });

const Milestone = mongoose.model('Milestone', milestoneSchema);
module.exports = Milestone;