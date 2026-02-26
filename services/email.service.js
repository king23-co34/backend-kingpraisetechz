const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = `${process.env.FROM_NAME || 'Dashboard Platform'} <${process.env.FROM_EMAIL || 'onboarding@resend.dev'}>`;

// ── Shared email wrapper ───────────────────────────────────────────
const sendEmail = async ({ to, subject, html }) => {
  try {
    const { data, error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) {
      console.error('Resend error:', error);
      return { success: false, error };
    }
    return { success: true, data };
  } catch (err) {
    console.error('Email send error:', err.message);
    return { success: false, error: err.message };
  }
};

// ── Email Templates ────────────────────────────────────────────────
const baseTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard Platform</title>
  <style>
    body { margin:0; padding:0; background:#0f0f13; font-family:'Segoe UI',sans-serif; color:#e2e8f0; }
    .wrapper { max-width:600px; margin:40px auto; background:#1a1a2e; border-radius:16px; overflow:hidden; border:1px solid #2d2d4e; }
    .header { background:linear-gradient(135deg,#6366f1,#8b5cf6); padding:40px 32px; text-align:center; }
    .header h1 { margin:0; font-size:28px; color:#fff; font-weight:700; letter-spacing:-0.5px; }
    .header p { margin:8px 0 0; color:rgba(255,255,255,0.8); font-size:14px; }
    .body { padding:40px 32px; }
    .body h2 { font-size:22px; color:#e2e8f0; margin:0 0 16px; }
    .body p { line-height:1.7; color:#94a3b8; margin:0 0 16px; font-size:15px; }
    .btn { display:inline-block; background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; text-decoration:none; padding:14px 32px; border-radius:10px; font-weight:600; font-size:15px; margin:16px 0; }
    .card { background:#0f0f13; border:1px solid #2d2d4e; border-radius:12px; padding:20px 24px; margin:16px 0; }
    .card .label { font-size:12px; color:#6366f1; text-transform:uppercase; letter-spacing:1px; font-weight:600; margin:0 0 4px; }
    .card .value { font-size:18px; color:#e2e8f0; font-weight:600; margin:0; }
    .footer { padding:24px 32px; text-align:center; border-top:1px solid #2d2d4e; }
    .footer p { font-size:12px; color:#4a5568; margin:0; }
    .badge { display:inline-block; padding:4px 12px; border-radius:20px; font-size:12px; font-weight:600; background:#6366f1; color:#fff; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>⚡ Dashboard Platform</h1>
      <p>Professional Project Management</p>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Dashboard Platform. All rights reserved.</p>
      <p style="margin-top:8px;">If you didn't request this, please ignore this email.</p>
    </div>
  </div>
</body>
</html>`;

// ── Specific Email Functions ───────────────────────────────────────

const sendWelcomeEmail = async (user) => {
  const html = baseTemplate(`
    <h2>Welcome aboard, ${user.firstName}! 🎉</h2>
    <p>Your account has been created successfully. You're now part of the Dashboard Platform as a <span class="badge">${user.role.toUpperCase()}</span>.</p>
    <p>You can now log in to access your personalized dashboard.</p>
    <a href="${process.env.FRONTEND_URL}/login" class="btn">Go to Dashboard →</a>
    <p style="margin-top:24px; font-size:13px;">Need help? Reply to this email and we'll be happy to assist.</p>
  `);
  return sendEmail({ to: user.email, subject: '🎉 Welcome to Dashboard Platform!', html });
};

const sendMilestoneEmail = async (client, project, milestone) => {
  const html = baseTemplate(`
    <h2>New Milestone Update 🚀</h2>
    <p>Hi ${client.firstName}, a new milestone has been added to your project.</p>
    <div class="card">
      <p class="label">Project</p>
      <p class="value">${project.title}</p>
    </div>
    <div class="card">
      <p class="label">Milestone</p>
      <p class="value">${milestone.title}</p>
    </div>
    <div class="card">
      <p class="label">Description</p>
      <p class="value" style="font-size:15px; font-weight:400;">${milestone.description}</p>
    </div>
    <div class="card">
      <p class="label">Due Date</p>
      <p class="value">${new Date(milestone.dueDate).toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</p>
    </div>
    <a href="${process.env.FRONTEND_URL}/dashboard/milestones" class="btn">View Milestone →</a>
  `);
  return sendEmail({ to: client.email, subject: `📌 New Milestone: ${milestone.title} — ${project.title}`, html });
};

const sendMilestoneCompletedEmail = async (client, project, milestone) => {
  const html = baseTemplate(`
    <h2>Milestone Completed! ✅</h2>
    <p>Great news, ${client.firstName}! A milestone in your project has been completed.</p>
    <div class="card">
      <p class="label">Project</p>
      <p class="value">${project.title}</p>
    </div>
    <div class="card">
      <p class="label">Completed Milestone</p>
      <p class="value">${milestone.title}</p>
    </div>
    <div class="card">
      <p class="label">Project Progress</p>
      <p class="value">${project.progress}% Complete</p>
    </div>
    <a href="${process.env.FRONTEND_URL}/dashboard/projects/${project._id}" class="btn">Track Progress →</a>
  `);
  return sendEmail({ to: client.email, subject: `✅ Milestone Completed: ${milestone.title}`, html });
};

const sendProjectCreatedEmail = async (client, project) => {
  const html = baseTemplate(`
    <h2>Your Project Has Started! 🎯</h2>
    <p>Hi ${client.firstName}, your project has been set up and work will begin soon.</p>
    <div class="card">
      <p class="label">Project Name</p>
      <p class="value">${project.title}</p>
    </div>
    <div class="card">
      <p class="label">Budget</p>
      <p class="value">${project.currency} ${project.budget.toLocaleString()}</p>
    </div>
    <div class="card">
      <p class="label">Delivery Date</p>
      <p class="value">${new Date(project.deliveryDate).toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</p>
    </div>
    <div class="card">
      <p class="label">Status</p>
      <p class="value" style="color:#6366f1;">${project.status.replace('_',' ').toUpperCase()}</p>
    </div>
    <a href="${process.env.FRONTEND_URL}/dashboard/projects/${project._id}" class="btn">View Your Project →</a>
  `);
  return sendEmail({ to: client.email, subject: `🚀 Project Started: ${project.title}`, html });
};

const sendTaskAssignedEmail = async (teamMember, project, task) => {
  const html = baseTemplate(`
    <h2>New Task Assigned to You 📋</h2>
    <p>Hi ${teamMember.firstName}, you've been assigned a new task.</p>
    <div class="card">
      <p class="label">Project</p>
      <p class="value">${project.title}</p>
    </div>
    <div class="card">
      <p class="label">Task</p>
      <p class="value">${task.title}</p>
    </div>
    <div class="card">
      <p class="label">Description</p>
      <p class="value" style="font-size:15px; font-weight:400;">${task.description}</p>
    </div>
    <div class="card">
      <p class="label">Priority</p>
      <p class="value">${task.priority.toUpperCase()}</p>
    </div>
    <div class="card">
      <p class="label">Due Date</p>
      <p class="value">${new Date(task.dueDate).toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</p>
    </div>
    <div class="card">
      <p class="label">Your Pay</p>
      <p class="value">${task.currency} ${task.payAmount.toLocaleString()}</p>
    </div>
    <a href="${process.env.FRONTEND_URL}/dashboard/tasks/${task._id}" class="btn">View Task →</a>
  `);
  return sendEmail({ to: teamMember.email, subject: `📋 New Task: ${task.title}`, html });
};

const sendTaskSubmissionEmail = async (admin, teamMember, project, task) => {
  const html = baseTemplate(`
    <h2>Task Submission Received 📥</h2>
    <p>Hi Admin, ${teamMember.fullName} has submitted a completed task for your review.</p>
    <div class="card">
      <p class="label">Project</p>
      <p class="value">${project.title}</p>
    </div>
    <div class="card">
      <p class="label">Task</p>
      <p class="value">${task.title}</p>
    </div>
    <div class="card">
      <p class="label">Submitted By</p>
      <p class="value">${teamMember.fullName} (${teamMember.email})</p>
    </div>
    <a href="${process.env.FRONTEND_URL}/admin/tasks/${task._id}" class="btn">Review Submission →</a>
  `);
  return sendEmail({ to: admin.email, subject: `📥 Task Submitted: ${task.title} — ${project.title}`, html });
};

const sendReviewApprovedEmail = async (client, review, project) => {
  const html = baseTemplate(`
    <h2>Your Review Was Approved! ⭐</h2>
    <p>Hi ${client.firstName}, your review for <strong>${project.title}</strong> has been approved and is now live on our website.</p>
    <div class="card">
      <p class="label">Your Rating</p>
      <p class="value">${'⭐'.repeat(review.rating)} (${review.rating}/5)</p>
    </div>
    <div class="card">
      <p class="label">Your Review</p>
      <p class="value" style="font-size:15px; font-weight:400;">"${review.content}"</p>
    </div>
    <p>Thank you for taking the time to share your experience with us!</p>
    <a href="${process.env.FRONTEND_URL}" class="btn">View Website →</a>
  `);
  return sendEmail({ to: client.email, subject: '⭐ Your review is now live!', html });
};

const sendAdminAccessEmail = async (teamMember, isPermanent, expiryDate) => {
  const duration = isPermanent ? 'permanently' : `until ${new Date(expiryDate).toLocaleDateString()}`;
  const html = baseTemplate(`
    <h2>Admin Access Granted 🔐</h2>
    <p>Hi ${teamMember.firstName}, you've been granted admin access to the Dashboard Platform <strong>${duration}</strong>.</p>
    <p>Your dashboard has been updated with admin capabilities. Please use this access responsibly.</p>
    ${!isPermanent ? `<div class="card"><p class="label">Access Expires</p><p class="value">${new Date(expiryDate).toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</p></div>` : ''}
    <a href="${process.env.FRONTEND_URL}/dashboard" class="btn">Go to Admin Dashboard →</a>
  `);
  return sendEmail({ to: teamMember.email, subject: '🔐 Admin Access Granted', html });
};

const sendPasswordResetEmail = async (user, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  const html = baseTemplate(`
    <h2>Reset Your Password 🔑</h2>
    <p>Hi ${user.firstName}, we received a request to reset your password.</p>
    <p>Click the button below to reset it. This link expires in <strong>1 hour</strong>.</p>
    <a href="${resetUrl}" class="btn">Reset Password →</a>
    <p style="margin-top:24px; font-size:13px; color:#64748b;">If you didn't request this, you can safely ignore this email. Your password won't be changed.</p>
  `);
  return sendEmail({ to: user.email, subject: '🔑 Reset Your Password', html });
};

const sendTwoFactorSetupEmail = async (user) => {
  const html = baseTemplate(`
    <h2>Two-Factor Authentication Setup 🔒</h2>
    <p>Hi ${user.firstName}, please set up Two-Factor Authentication to secure your account.</p>
    <p>After logging in, you'll be asked to scan a QR code with the <strong>Google Authenticator</strong> app.</p>
    <p>Download Google Authenticator:</p>
    <p>📱 <a href="https://apps.apple.com/app/google-authenticator/id388497605" style="color:#6366f1;">iOS App Store</a></p>
    <p>🤖 <a href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2" style="color:#6366f1;">Google Play Store</a></p>
    <a href="${process.env.FRONTEND_URL}/setup-2fa" class="btn">Complete 2FA Setup →</a>
  `);
  return sendEmail({ to: user.email, subject: '🔒 Set Up Two-Factor Authentication', html });
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendMilestoneEmail,
  sendMilestoneCompletedEmail,
  sendProjectCreatedEmail,
  sendTaskAssignedEmail,
  sendTaskSubmissionEmail,
  sendReviewApprovedEmail,
  sendAdminAccessEmail,
  sendPasswordResetEmail,
  sendTwoFactorSetupEmail
};s