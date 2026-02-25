const Project = require("../models/Project");
const User = require("../models/User");
const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

// ===============================
// 1. UPLOAD RECENT PROJECT
// ===============================
exports.uploadProject = async (req, res) => {
  try {
    const { title, description, image, link } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: "Title and description are required",
      });
    }

    const newProject = await Project.create({
      title,
      description,
      image,
      link,
      status: "completed",
    });

    res.status(201).json({
      success: true,
      message: "Project live on homepage!",
      project: newProject,
    });
  } catch (error) {
    console.error("Upload Project Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while uploading project",
    });
  }
};

// ===============================
// 2. UPDATE CLIENT PROGRESS & NOTIFY
// ===============================
exports.updateProgress = async (req, res) => {
  try {
    const { clientId, progress } = req.body;

    if (!clientId || progress === undefined) {
      return res.status(400).json({
        success: false,
        message: "Client ID and progress are required",
      });
    }

    if (progress < 0 || progress > 100) {
      return res.status(400).json({
        success: false,
        message: "Progress must be between 0 and 100",
      });
    }

    const user = await User.findById(clientId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    user.projectProgress = progress;

    // If project completed
    if (progress === 100) {
      user.projectStatus = "completed";

      // Send Email using Resend
      await resend.emails.send({
        from: "KingPraise Tech <onboarding@resend.dev>", 
        to: user.email,
        subject: "🎉 Your Website Project is Completed!",
        html: `
          <div style="font-family: Arial, sans-serif;">
            <h2>Hi ${user.name || "Client"},</h2>
            <p>Great news! 🎉</p>
            <p>Your website project has been successfully completed.</p>
            <p>You can now review your project and request any final adjustments.</p>
            <br/>
            <p>Thank you for choosing KingPraise Tech.</p>
            <strong>— KingPraise Tech Team</strong>
          </div>
        `,
      });
    } else {
      user.projectStatus = "in-progress";
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Progress updated successfully",
      user,
    });
  } catch (error) {
    console.error("Update Progress Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating progress",
    });
  }
};