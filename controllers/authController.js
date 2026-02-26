const User = require('../models/users');
const { generateToken } = require('../utils/jwt');
const { sendEmail } = require('../services/email');

exports.signup = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const user = new User({ firstName, lastName, email, password, role });
    await user.save();

    await sendEmail({ to: email, template: 'welcome', data: [firstName, role] });

    res.status(201).json({ user: user.toSafeObject(), token: generateToken(user._id, role) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    res.json({ user: user.toSafeObject(), token: generateToken(user._id, user.role) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMe = async (req, res) => {
  res.json({ user: req.user.toSafeObject() });
};