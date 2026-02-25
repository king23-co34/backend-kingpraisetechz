const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  budget: {
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    paid: { type: Number, default: 0 }
  },
  
  deliveryDate: { type: Date, required: true },
  startDate: { type: Date, default: Date.now },
  
  status: {
    type: String,
    enum: ['planning', 'in-progress', 'review', 'completed', 'on-hold', 'cancelled'],
    default: 'planning'
  },
  
  progress: { type: Number, default: 0, min: 0, max: 100 },
  
  category: { type: String },
  tags: [String],
  
  attachments: [{
    name: String,
    url: String,
    type: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  // Tasks assigned to team members
  tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  
  // Milestones
  milestones: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Milestone' }],
  
  isArchived: { type: Boolean, default: false }
}, { timestamps: true });

projectSchema.virtual('completionPercentage').get(function() {
  return this.progress;
});

module.exports = mongoose.model('Project', projectSchema);