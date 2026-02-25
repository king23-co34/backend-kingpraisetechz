const Project = require("../models/Project");
const User = require("../models/User");
const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

// ===============================
// 1. DASHBOARD OVERVIEW
// ===============================
exports.getOverview = async (req, res) => {
  try {
    const totalClients = await User.countDocuments({ role: "client" });
    const activeProjects = await Project.countDocuments({ status: "active" });

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthlyRevenueAgg = await Project.aggregate([
      { $match: { status: "completed", completedAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: "$budget" } } },
    ]);
    const monthlyRevenue = monthlyRevenueAgg[0]?.total || 0;

    const pendingTasks = await Project.countDocuments({ status: { $ne: "completed" } });

    const revenueGrowth = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1);
      const end = new Date(new Date().getFullYear(), new Date().getMonth() - i + 1, 0);
      const agg = await Project.aggregate([
        { $match: { status: "completed", completedAt: { $gte: start, $lte: end } } },
        { $group: { _id: null, total: { $sum: "$budget" } } },
      ]);
      revenueGrowth.push({
        month: start.toLocaleString("default", { month: "short" }),
        revenue: agg[0]?.total || 0,
      });
    }

    res.json({ totalClients, activeProjects, monthlyRevenue, pendingTasks, revenueGrowth });
  } catch (err) {
    console.error("Error in getOverview:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ===============================
// 2. UPLOAD RECENT PROJECT
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
// 3. UPDATE CLIENT PROGRESS & NOTIFY
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
    if (!user) return res.status(404).json({ success: false, message: "Client not found" });

    user.projectProgress = progress;
    user.projectStatus = progress === 100 ? "completed" : "in-progress";

    // Send notification if project completed
    if (progress === 100) {
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
    }

    await user.save();
    res.status(200).json({ success: true, message: "Progress updated successfully", user });
  } catch (error) {
    console.error("Update Progress Error:", error);
    res.status(500).json({ success: false, message: "Server error while updating progress" });
  }
};