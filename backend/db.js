const mongoose = require('mongoose');

// Connect to MongoDB using the connection string in your .env file
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI); // Connects to your Mongo database
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection failed', err.message);
    process.exit(1); // Exit the process if connection fails
  }
};

module.exports = connectDB;
