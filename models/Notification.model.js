const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  type: {
    type: String,
    enum: [
      'task_assigned', 'task_submitted', 'task_approved', 'task_rejected',
      'project_created', 'project_updated', 'project_completed',
      'milestone_created', 'milestone_completed',
      'review_submitted', 'review_approved', 'review_rejected',
      'admin_access_granted', 'admin_access_revoked',
      'general'
    ],
    required: true
  },

  title:   { type: String, required: true },
  message: { type: String, required: true },

  link:    { type: String, default: null }, // frontend deep link
  isRead:  { type: Boolean, default: false },
  readAt:  { type: Date, default: null },

  // Related documents
  relatedProject:   { type: mongoose.Schema.Types.ObjectId, ref: 'Project',   default: null },
  relatedTask:      { type: mongoose.Schema.Types.ObjectId, ref: 'Task',      default: null },
  relatedMilestone: { type: mongoose.Schema.Types.ObjectId, ref: 'Milestone', default: null }

}, { timestamps: true });

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;