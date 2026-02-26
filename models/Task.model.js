const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  project:   { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  assignedTo:{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // team member
  assignedBy:{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // admin
  milestone: { type: mongoose.Schema.Types.ObjectId, ref: 'Milestone', default: null },

  title:       { type: String, required: true },
  description: { type: String, required: true },

  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },

  status: {
    type: String,
    enum: ['todo', 'in_progress', 'review', 'completed', 'rejected'],
    default: 'todo'
  },

  dueDate:     { type: Date, required: true },
  completedAt: { type: Date, default: null },

  // Payment for this task
  payAmount:   { type: Number, default: 0 },
  currency:    { type: String, default: 'USD' },
  isPaid:      { type: Boolean, default: false },

  // Team member uploads when task is done
  submissions: [{
    note:        String,
    fileUrl:     String,
    filePublicId:String,
    fileName:    String,
    submittedAt: { type: Date, default: Date.now }
  }],

  // Admin feedback
  adminFeedback: { type: String, default: null },
  reviewedAt:    { type: Date, default: null },
  reviewedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  estimatedHours: { type: Number, default: 0 },
  actualHours:    { type: Number, default: 0 },

  tags: [{ type: String }]

}, { timestamps: true });

const Task = mongoose.model('Task', taskSchema);
module.exports = Task;