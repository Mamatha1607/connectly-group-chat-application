// models/Message.js
const mongoose = require("mongoose");

// Schema for a chat message in the app
const MessageSchema = new mongoose.Schema({
  // Reference to the user who sent the message
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  // Reference to the chat room where the message was sent
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },

  // The text content of the message itself
  message: { type: String, required: true },

  // When the message was sent (defaults to now)
  timestamp: { type: Date, default: Date.now }
});

// Expose the Message model so it can be used throughout the app
module.exports = mongoose.model("Message", MessageSchema);
