const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.FROM_EMAIL || 'onboarding@resend.dev';

const emailTemplates = {
  welcome: (name, role) => ({
    subject: `Welcome to the Platform, ${name}!`,
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0f; color: #e2e8f0; padding: 40px; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 16px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 28px;">✦</span>
          </div>
          <h1 style="font-size: 28px; font-weight: 700; margin: 0; background: linear-gradient(135deg, #6366f1, #a78bfa); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Welcome aboard</h1>
        </div>
        <p style="font-size: 18px; color: #94a3b8;">Hi ${name},</p>
        <p style="color: #94a3b8; line-height: 1.8;">Your account has been created as a <strong style="color: #a78bfa;">${role}</strong>. You can now log in and access your personalized dashboard.</p>
        <div style="text-align: center; margin: 40px 0;">
          <a href="${process.env.FRONTEND_URL}/auth" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px;">Get Started →</a>
        </div>
        <p style="color: #64748b; font-size: 14px; text-align: center; margin-top: 40px;">© 2024 Platform. All rights reserved.</p>
      </div>
    `
  }),
  
  milestoneUpdate: (clientName, projectTitle, milestoneTitle, milestoneDesc, status) => ({
    subject: `Project Milestone Update: ${milestoneTitle}`,
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0f; color: #e2e8f0; padding: 40px; border-radius: 16px;">
        <div style="border-left: 4px solid #6366f1; padding-left: 20px; margin-bottom: 30px;">
          <h2 style="color: #a78bfa; margin: 0 0 8px;">Milestone Update</h2>
          <p style="color: #64748b; margin: 0; font-size: 14px;">Project: ${projectTitle}</p>
        </div>
        <p style="color: #94a3b8;">Hi ${clientName},</p>
        <p style="color: #94a3b8; line-height: 1.8;">A new milestone has been reached on your project:</p>
        <div style="background: #13131a; border: 1px solid #1e1e2e; border-radius: 12px; padding: 24px; margin: 20px 0;">
          <h3 style="color: #e2e8f0; margin: 0 0 12px;">${milestoneTitle}</h3>
          <p style="color: #94a3b8; margin: 0 0 16px;">${milestoneDesc}</p>
          <span style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600;">${status}</span>
        </div>
        <p style="color: #94a3b8;">Log in to your dashboard to view full details and track progress.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/dashboard" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600;">View Dashboard →</a>
        </div>
      </div>
    `
  }),

  taskSubmitted: (adminEmail, teamName, taskTitle, projectTitle) => ({
    subject: `Task Submitted: ${taskTitle}`,
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0f; color: #e2e8f0; padding: 40px; border-radius: 16px;">
        <h2 style="color: #a78bfa;">Task Submission</h2>
        <p style="color: #94a3b8;">Hi Admin,</p>
        <p style="color: #94a3b8; line-height: 1.8;"><strong style="color: #e2e8f0;">${teamName}</strong> has submitted the task <strong style="color: #a78bfa;">"${taskTitle}"</strong> for project <strong style="color: #e2e8f0;">${projectTitle}</strong>.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/dashboard/admin/tasks" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600;">Review Submission →</a>
        </div>
      </div>
    `
  }),

  twoFactorSetup: (name) => ({
    subject: 'Two-Factor Authentication Enabled',
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0f; color: #e2e8f0; padding: 40px; border-radius: 16px;">
        <h2 style="color: #a78bfa;">🔐 2FA Enabled Successfully</h2>
        <p style="color: #94a3b8;">Hi ${name},</p>
        <p style="color: #94a3b8; line-height: 1.8;">Two-factor authentication has been successfully enabled on your account. Your account is now more secure.</p>
        <p style="color: #64748b; font-size: 14px;">If you didn't make this change, please contact support immediately.</p>
      </div>
    `
  })
};

const sendEmail = async ({ to, template, data = [] }) => {
  try {
    const tpl = emailTemplates[template](...data);
    const result = await resend.emails.send({
      from: FROM,
      to: Array.isArray(to) ? to : [to],
      subject: tpl.subject,
      html: tpl.html
    });
    return { success: true, id: result.id };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
};

module.exports = { sendEmail };