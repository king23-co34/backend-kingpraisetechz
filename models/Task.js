const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  payment: {
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    paid: { type: Boolean, default: false }
  },
  
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'submitted', 'revision', 'approved', 'rejected'],
    default: 'pending'
  },
  
  dueDate: { type: Date },
  
  submission: {
    submittedAt: Date,
    files: [{
      name: String,
      url: String,
      type: String
    }],
    notes: String
  },
  
  adminFeedback: { type: String },
  
  tags: [String]
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);