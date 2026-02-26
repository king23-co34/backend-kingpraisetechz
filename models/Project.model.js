const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  description: { type: String, required: true },
  
  // ── Client Assignment ──────────────────────────────────────────
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // ── Admin who created the project ─────────────────────────────
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // ── Budget & Timeline ──────────────────────────────────────────
  budget:       { type: Number, required: true },
  currency:     { type: String, default: 'USD' },
  deliveryDate: { type: Date, required: true },
  startDate:    { type: Date, default: Date.now },

  // ── Status ─────────────────────────────────────────────────────
  status: {
    type: String,
    enum: ['planning', 'in_progress', 'review', 'completed', 'on_hold', 'cancelled'],
    default: 'planning'
  },

  // ── Progress (0–100) ──────────────────────────────────────────
  progress: { type: Number, default: 0, min: 0, max: 100 },

  // ── Category / Type ────────────────────────────────────────────
  category:    { type: String, default: 'Web Development' },
  tags:        [{ type: String }],

  // ── Files / Attachments ────────────────────────────────────────
  attachments: [{
    name:       String,
    url:        String,
    publicId:   String,
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],

  // ── Milestones (embedded reference) ───────────────────────────
  milestones: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Milestone' }],

  // ── Tasks (embedded reference) ────────────────────────────────
  tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],

  // ── Review submitted by client ────────────────────────────────
  review: { type: mongoose.Schema.Types.ObjectId, ref: 'Review', default: null },

  // ── Notes (visible to admin only) ────────────────────────────
  internalNotes: { type: String, default: '' },

  isArchived: { type: Boolean, default: false }

}, { timestamps: true });

// Auto-calculate progress from milestones
projectSchema.methods.recalculateProgress = async function () {
  const Milestone = mongoose.model('Milestone');
  const milestones = await Milestone.find({ project: this._id });
  if (!milestones.length) return;
  const completed = milestones.filter(m => m.status === 'completed').length;
  this.progress = Math.round((completed / milestones.length) * 100);
  await this.save();
};

const Project = mongoose.model('Project', projectSchema);
module.exports = Project;