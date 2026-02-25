// reviewController.js
const Review = require("../models/Review");

exports.createReview = async (req, res) => {
  try {
    const review = await Review.create(req.body);
    res.status(201).json(review);
  } catch (err) {
    console.error("createReview error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getReviews = async (req, res) => {
  try {
    const reviews = await Review.find();
    res.json(reviews);
  } catch (err) {
    console.error("getReviews error:", err);
    res.status(500).json({ message: "Server error" });
  }
};