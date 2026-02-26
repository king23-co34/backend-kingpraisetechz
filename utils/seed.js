const User = require('../models/User.model');

const seedAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'chibuksai@gmail.com';
    const existing = await User.findOne({ email: adminEmail });

    if (!existing) {
      await User.create({
        firstName: 'Chibuks',
        lastName:  'Admin',
        email:     adminEmail,
        password:  process.env.ADMIN_PASSWORD || 'Password123',
        role:      'admin',
        isActive:  true,
        isVerified:true,
        twoFactorEnabled: false, // admin bypasses 2FA
        onboardingComplete: true
      });
      console.log(`✅ Admin user seeded: ${adminEmail}`);
    } else {
      console.log(`ℹ️  Admin user already exists: ${adminEmail}`);
    }
  } catch (err) {
    console.error('❌ Error seeding admin:', err.message);
  }
};

module.exports = { seedAdmin };