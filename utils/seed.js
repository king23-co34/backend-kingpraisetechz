const User = require('../models/User');

const seedAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'chibuksai@gmail.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Password123';
    
    const existing = await User.findOne({ email: adminEmail });
    if (!existing) {
      const admin = new User({
        email: adminEmail,
        password: adminPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isEmailVerified: true,
        twoFactorEnabled: false // Admin bypasses 2FA
      });
      await admin.save();
      console.log('✅ Admin account seeded:', adminEmail);
    } else {
      console.log('ℹ️ Admin account already exists');
    }
  } catch (err) {
    console.error('❌ Failed to seed admin:', err.message);
  }
};

module.exports = { seedAdmin };