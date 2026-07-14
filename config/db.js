const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        const dbUrl = "mongodb://127.0.0.1:27017/admin_panel";
        await mongoose.connect(dbUrl);
        console.log("MongoDB connected successfully");
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
    }
};

module.exports = connectDB;
