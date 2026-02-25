const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Project title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: { type: String, trim: true },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Client is required"],
    },
    assignedTeam: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Review", "Completed", "Cancelled"],
      default: "Pending",
    },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    startDate: { type: Date },
    dueDate: { type: Date },
    completedAt: { type: Date },
    budget: { type: Number, default: 0 },
    tags: [{ type: String, trim: true }],
    attachments: [{ name: String, url: String, uploadedAt: Date }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Auto-set completedAt when progress hits 100
projectSchema.pre("save", function (next) {
  if (this.progress === 100 && !this.completedAt) {
    this.completedAt = new Date();
    this.status = "Completed";
  }
  next();
});

// Virtual: task count (populated separately)
projectSchema.virtual("tasks", {
  ref: "Task",
  localField: "_id",
  foreignField: "project",
});

module.exports = mongoose.model("Project", projectSchema);
