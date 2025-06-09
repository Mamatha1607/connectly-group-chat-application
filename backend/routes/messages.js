const express = require("express");
const Message = require("../models/Message");
const Room = require("../models/Room");
const User = require("../models/User");
const auth = require("../middleware/auth");
const router = express.Router();

// Send a message in a chat room, and notify all room members (except the sender)
router.post("/", auth, async (req, res) => {
  const { message, roomId } = req.body;

  try {
    // Save the message to the database
    const newMsg = await Message.create({
      sender: req.user.id,
      roomId,
      message,
      timestamp: new Date(),
    });

    // Prepare the message for broadcast (with sender's name)
    const msgToSend = await Message.findById(newMsg._id).populate("sender", "firstName email");

    // Broadcast the message to all sockets in this room
    if (global.io) {
      global.io.to(roomId).emit("receive_message", {
        ...msgToSend.toObject(),
        room: roomId,
      });
    }

    // Notify all members (except sender) with a real-time notification
    const room = await Room.findById(roomId).populate("members");
    if (room) {
      const notifPayload = {
        type: "message",
        roomId: room._id,
        fromUser: req.user.id,
        message: `${req.user.firstName} sent a message in "${room.name}"`,
        isRead: false,
        timestamp: new Date(),
        path: `/chat/${room._id}`,
      };
      for (const member of room.members) {
        if (member._id.toString() !== req.user.id.toString()) {
          const userDoc = await User.findById(member._id);
          userDoc.notifications.push(notifPayload);
          await userDoc.save();

          if (global.io) {
            global.io.to(member._id.toString()).emit("notification", notifPayload);
          }
        }
      }
    }

    res.status(201).json(msgToSend); // Respond with full message (for consistency)
  } catch (err) {
    res.status(500).json({ msg: "Message send failed", error: err.message });
  }
});

// Get all messages for a specific room, sorted by oldest first
router.get("/:roomId", auth, async (req, res) => {
  try {
    const messages = await Message.find({ roomId: req.params.roomId })
      .populate("sender", "firstName email")
      .sort({ timestamp: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ msg: "Load failed", error: err.message });
  }
});

// Clear all messages in a room (must be a group member)
router.delete("/room/:roomId", auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ msg: "Room not found" });

    // Only members can clear the chat
    if (!room.members.includes(req.user.id)) {
      return res.status(403).json({ msg: "You must be a member to clear chat" });
    }

    await Message.deleteMany({ roomId: req.params.roomId });
    res.json({ msg: "Chat cleared successfully" });
  } catch (err) {
    res.status(500).json({ msg: "Failed to clear chat", error: err.message });
  }
});

// Delete a single message (by id)
router.delete("/:msgId", auth, async (req, res) => {
  try {
    const msg = await Message.findById(req.params.msgId);
    if (!msg) return res.status(404).json({ msg: "Message not found" });

    // Only sender can delete their message
    if (msg.sender.toString() !== req.user.id) {
      return res.status(403).json({ msg: "You can only delete your own messages" });
    }

    await msg.deleteOne();
    res.json({ msg: "Message deleted" });
  } catch (err) {
    res.status(500).json({ msg: "Delete failed", error: err.message });
  }
});

module.exports = router;
