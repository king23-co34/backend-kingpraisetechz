const cron = require('node-cron');
const User = require('../models/User.model');
const Notification = require('../models/Notification.model');

// Run every hour — check for expired temporary admin access
const startAdminExpiryJob = () => {
  cron.schedule('0 * * * *', async () => {
    try {
      const expiredAdmins = await User.find({
        role: 'team',
        isTemporaryAdmin: true,
        temporaryAdminUntil: { $lt: new Date() }
      });

      for (const user of expiredAdmins) {
        user.isTemporaryAdmin    = false;
        user.temporaryAdminUntil = null;
        await user.save();

        await Notification.create({
          recipient: user._id,
          type: 'admin_access_revoked',
          title: 'Temporary Admin Access Expired',
          message: 'Your temporary admin access has expired. Your dashboard has returned to team view.'
        });

        console.log(`✅ Auto-revoked admin access for ${user.email}`);
      }
    } catch (err) {
      console.error('❌ Admin expiry cron error:', err.message);
    }
  });

  console.log('⏰ Admin expiry cron job started (runs hourly)');
};

module.exports = { startAdminExpiryJob };