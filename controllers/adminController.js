const User = require('../models/users');

exports.getUsers = async (req, res) => {
  try {
    const { role, search } = req.query;
    let query = {};
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const users = await User.find(query)
      .select('-password -twoFactorSecret -passwordResetToken -emailVerificationToken')
      .sort({ createdAt: -1 });
    
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

exports.grantAdminAccess = async (req, res) => {
  try {
    const { userId, type, expiresAt } = req.body;
    // type: 'permanent' | 'temporary'
    
    const user = await User.findOne({ _id: userId, role: 'team' });
    if (!user) return res.status(404).json({ error: 'Team member not found' });
    
    const update = {
      isTemporaryAdmin: true,
      temporaryAdminGrantedBy: req.user._id
    };
    
    if (type === 'permanent') {
      update.role = 'admin';
      update.isTemporaryAdmin = false;
      update.temporaryAdminUntil = null;
    } else {
      if (!expiresAt) return res.status(400).json({ error: 'Expiry date required for temporary access' });
      update.temporaryAdminUntil = new Date(expiresAt);
    }
    
    const updatedUser = await User.findByIdAndUpdate(userId, update, { new: true })
      .select('-password -twoFactorSecret');
    
    await User.findByIdAndUpdate(userId, {
      $push: {
        notifications: {
          message: type === 'permanent'
            ? 'You have been permanently promoted to Admin.'
            : `You have been granted temporary Admin access until ${new Date(expiresAt).toLocaleDateString()}.`,
          type: 'success'
        }
      }
    });
    
    res.json({ user: updatedUser, message: `Admin access granted (${type})` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to grant admin access' });
  }
};

exports.revokeAdminAccess = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findByIdAndUpdate(userId, {
      isTemporaryAdmin: false,
      temporaryAdminUntil: null,
      temporaryAdminGrantedBy: null
    }, { new: true }).select('-password -twoFactorSecret');
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    await User.findByIdAndUpdate(userId, {
      $push: {
        notifications: {
          message: 'Your admin access has been revoked.',
          type: 'warning'
        }
      }
    });
    
    res.json({ user, message: 'Admin access revoked' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to revoke admin access' });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { isActive },
      { new: true }
    ).select('-password -twoFactorSecret');
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user status' });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notifications');
    res.json({ notifications: user.notifications.reverse() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    await User.updateOne(
      { _id: req.user._id, 'notifications._id': req.params.notifId },
      { $set: { 'notifications.$.read': true } }
    );
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notification' });
  }
};