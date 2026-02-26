const User = require("../models/users");

module.exports = (role) => {
  return async (req, res, next) => {
    const user = await User.findById(req.user.id);
    if (user.role !== role)
      return res.status(403).json({ message: "Forbidden" });

    next();
  };
};