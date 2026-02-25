const Project = require("../models/Project");
const User = require("../models/User");
const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

// ADMIN UPLOAD PROJECT
exports.uploadProject = async (req, res) => {
  const project = await Project.create({
    ...req.body,
    createdBy: req.user.id,
  });

  res.json(project);
};

// UPDATE CLIENT PROGRESS
exports.updateProgress = async (req, res) => {
  const { clientId, progress } = req.body;

  const user = await User.findById(clientId);

  user.projectProgress = progress;

  if (progress === 100) {
    user.projectStatus = "completed";

    await resend.emails.send({
      from: "KingPraise Tech <onboarding@resend.dev>",
      to: user.email,
      subject: "Project Completed 🎉",
      html: `<h2>Your website is ready!</h2>`,
    });
  }

  await user.save();
  res.json({ message: "Updated" });
};