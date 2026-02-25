const Review = require("../models/Review");

exports.addReview = async (req, res) => {
  const review = await Review.create({
    user: req.user.id,
    message: req.body.message,
    rating: req.body.rating,
  });

  res.json(review);
};

exports.getReviews = async (req, res) => {
  const reviews = await Review.find().populate("user", "name");
  res.json(reviews);
};