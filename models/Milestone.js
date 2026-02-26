const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dueDate: { type: Date },
  completedAt: { type: Date },
  status: { type: String, enum: ['upcoming','in-progress','completed','delayed'], default: 'upcoming' },
  order: { type: Number, default: 0 },
  attachments: [{ name: String, url: String, type: String }],
  emailSent: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Milestone', milestoneSchema);