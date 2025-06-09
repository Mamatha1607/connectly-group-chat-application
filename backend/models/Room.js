const mongoose = require("mongoose");

const RoomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  tags: [String],
  isPrivate: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  joinRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  
  // ✅ Shared theme visible to all members
  theme: {
    type: String,
    enum: ["blue", "pink", "green", "orange", "purple", "gray"],
   
  }
}, { timestamps: true });

module.exports = mongoose.model("Room", RoomSchema);
