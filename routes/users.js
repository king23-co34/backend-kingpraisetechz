const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const User = require('../models/User');

router.use(authenticate);

router.get('/clients', async (req, res) => {
  try {
    const clients = await User.find({ role: 'client', isActive: true })
      .select('firstName lastName email company avatar')
      .sort({ firstName: 1 });
    res.json({ clients });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

router.get('/team', async (req, res) => {
  try {
    const team = await User.find({ role: 'team', isActive: true })
      .select('firstName lastName email position avatar isTemporaryAdmin temporaryAdminUntil')
      .sort({ firstName: 1 });
    res.json({ team });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch team' });
  }
});

router.put('/profile', async (req, res) => {
  try {
    const { firstName, lastName, phone, company, position, bio, avatar } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { firstName, lastName, phone, company, position, bio, avatar },
      { new: true }
    ).select('-password -twoFactorSecret');
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;