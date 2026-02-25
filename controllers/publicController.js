const { sendSuccess } = require("../utils/response");

// @desc  Public landing page info
// @route GET /api/public/info
exports.getInfo = (req, res) => {
  sendSuccess(res, {
    info: {
      name: "KingPraise Techz",
      description: "Professional tech solutions",
      contact: "info@king-praise-techz.com",
    },
  });
};
