const mongoose = require('mongoose');

// Notifications for user actions (like join requests, messages, etc.)
const NotificationSchema = new mongoose.Schema({
  type: { type: String, required: true }, // e.g., "join_request", "new_message"
  message: { type: String, required: true },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// User’s theme preferences for the app (colors, etc.)
const ThemeSchema = new mongoose.Schema({
  background: { type: String, default: "#ffffff" },
  textColor: { type: String, default: "#000000" },
  accentColor: { type: String, default: "#3b82f6" }
}, { _id: false });

// User schema combines account info, notifications, and theme
const UserSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, required: true, unique: true },
  password: String,
  dob: Date,
  securityQuestion: String,
  otp: String,              // For password reset (OTP)
  otpExpires: Date,
  notifications: [NotificationSchema], // List of all user notifications
  theme: ThemeSchema,                  // User’s chosen theme
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
