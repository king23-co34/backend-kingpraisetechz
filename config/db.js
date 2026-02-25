const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log(`[MongoDB] Connected: ${conn.connection.host}`);

    mongoose.connection.on("disconnected", () =>
      console.warn("[MongoDB] Disconnected. Retrying...")
    );
    mongoose.connection.on("error", (err) =>
      console.error("[MongoDB] Error:", err)
    );
  } catch (err) {
    console.error("[MongoDB] Connection failed:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
