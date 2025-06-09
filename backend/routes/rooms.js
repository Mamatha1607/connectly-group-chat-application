const express = require("express");
const router = express.Router();
const Room = require("../models/Room");
const User = require("../models/User");
const auth = require("../middleware/auth");

// Create a new chat room (user becomes admin and first member)
router.post("/create", auth, async (req, res) => {
  try {
    const { name, description, tags, isPrivate } = req.body;
    const newRoom = new Room({
      name,
      description,
      tags,
      isPrivate,
      createdBy: req.user.id,
      members: [req.user.id],
      theme: "blue" // Default room theme
    });
    await newRoom.save();
    res.status(201).json(newRoom);
  } catch (err) {
    res.status(500).json({ msg: "Room creation failed", error: err.message });
  }
});

// Get all rooms: returns public rooms and any private rooms where user is a member
router.get("/", auth, async (req, res) => {
  try {
    const rooms = await Room.find({
      $or: [{ isPrivate: false }, { members: req.user.id }],
    })
      .populate("members", "firstName lastName email")
      .populate("joinRequests", "firstName lastName email");
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ msg: "Failed to load rooms", error: err.message });
  }
});

// Search rooms by name, description, or tags
router.get("/search", auth, async (req, res) => {
  const { q } = req.query;
  const searchRegex = new RegExp(q, "i");
  try {
    const rooms = await Room.find({
      $or: [
        { name: searchRegex },
        { description: searchRegex },
        { tags: { $elemMatch: { $regex: searchRegex } } },
      ]
    })
      .populate("members", "firstName lastName email")
      .populate("joinRequests", "firstName lastName email");
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ msg: "Search failed", error: err.message });
  }
});

// Get all rooms the current user is a member of
router.get("/my", auth, async (req, res) => {
  try {
    const rooms = await Room.find({ members: req.user.id });
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ msg: "Failed to load user rooms" });
  }
});

// Get info about a specific room (only if member)
router.get("/:roomId", auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId)
      .populate("members", "firstName lastName email")
      .populate("joinRequests", "firstName lastName email");
    if (!room) return res.status(404).json({ msg: "Room not found" });
    const isMember = room.members.some(m => m._id.toString() === req.user.id);
    if (!isMember) return res.status(403).json({ msg: "You are not a member of this room" });
    res.json(room);
  } catch (err) {
    res.status(500).json({ msg: "Failed to load room", error: err.message });
  }
});

// Request to join a private room (adds user to joinRequests & notifies admin)
router.post("/:roomId/request", auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room || !room.isPrivate) return res.status(400).json({ msg: "Room not found or not private" });
    if (room.members.includes(req.user.id)) return res.status(400).json({ msg: "Already a member" });

    // Remove old request if present, then add again (prevents duplicates)
    room.joinRequests = room.joinRequests.filter(id => id.toString() !== req.user.id);
    room.joinRequests.push(req.user.id);
    await room.save();

    // Notify the room admin about the join request
    const admin = await User.findById(room.createdBy);
    const notif = {
      type: "join_request",
      roomId: room._id,
      fromUser: req.user.id,
      message: `${req.user.firstName} requested to join "${room.name}"`,
      isRead: false,
    };
    admin.notifications.push(notif);
    await admin.save();

    // Emit real-time notification if possible
    if (global.io) {
      global.io.to(admin._id.toString()).emit("notification", notif);
    }

    res.json({ msg: "Join request (re)sent successfully" });
  } catch (err) {
    res.status(500).json({ msg: "Failed to send join request", error: err.message });
  }
});

// Admin approves a user to join a private room
router.post("/:roomId/approve", auth, async (req, res) => {
  try {
    const { userId } = req.body;
    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ msg: "Room not found" });
    if (room.createdBy.toString() !== req.user.id) return res.status(403).json({ msg: "Not authorized" });

    if (!room.joinRequests.includes(userId)) return res.status(400).json({ msg: "User not in join requests" });

    room.members.push(userId);
    room.joinRequests = room.joinRequests.filter(id => id.toString() !== userId);
    await room.save();

    res.json({ msg: "User approved and added to room" });
  } catch (err) {
    res.status(500).json({ msg: "Approval failed", error: err.message });
  }
});

// Join a public room (private rooms must use request flow)
router.post("/:roomId/join", auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ msg: "Room not found" });
    if (room.isPrivate) return res.status(403).json({ msg: "Cannot join private room directly" });

    // Add user if not already a member
    if (!room.members.includes(req.user.id)) {
      room.members.push(req.user.id);
      await room.save();
    }

    res.json({ msg: "Joined room" });
  } catch (err) {
    res.status(500).json({ msg: "Failed to join room", error: err.message });
  }
});

// Only the admin can rename the group
router.put("/:roomId", auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ msg: "Room not found" });
    if (room.createdBy.toString() !== req.user.id) return res.status(403).json({ msg: "Only admin can rename room" });

    room.name = req.body.name || room.name;
    await room.save();
    res.json(room);
  } catch (err) {
    res.status(500).json({ msg: "Failed to rename room", error: err.message });
  }
});

// Member leaves a room (removes themselves from members list)
router.post("/:roomId/leave", auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ msg: "Room not found" });

    room.members = room.members.filter(id => id.toString() !== req.user.id.toString());
    await room.save();

    res.json({ msg: "Left the room" });
  } catch (err) {
    res.status(500).json({ msg: "Failed to leave room", error: err.message });
  }
});

// Only the admin can delete the group entirely
router.delete("/:roomId", auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ msg: "Room not found" });

    if (room.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Only admin can delete room" });
    }

    await room.deleteOne();
    res.json({ msg: "Room deleted" });
  } catch (err) {
    res.status(500).json({ msg: "Failed to delete room", error: err.message });
  }
});

// Admin adds a user to the group by email
router.post("/:roomId/add", auth, async (req, res) => {
  try {
    const { email } = req.body;
    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ msg: "Room not found" });

    if (room.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Only admin can add users" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: "User not found" });

    if (!room.members.includes(user._id)) {
      room.members.push(user._id);
      await room.save();
    }

    res.json({ msg: "User added" });
  } catch (err) {
    res.status(500).json({ msg: "Failed to add user", error: err.message });
  }
});

// Admin removes a user from the group by email
router.post("/:roomId/remove", auth, async (req, res) => {
  try {
    const { email } = req.body;
    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ msg: "Room not found" });

    if (room.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Only admin can remove users" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: "User not found" });

    room.members = room.members.filter(id => id.toString() !== user._id.toString());
    await room.save();

    res.json({ msg: "User removed" });
  } catch (err) {
    res.status(500).json({ msg: "Failed to remove user", error: err.message });
  }
});

// Room theme: only members can change group-wide theme, applies to everyone
router.post("/:roomId/theme", auth, async (req, res) => {
  try {
    const { theme } = req.body;
    const allowedThemes = ["blue", "pink", "green", "orange", "dark"];
    if (!allowedThemes.includes(theme)) return res.status(400).json({ msg: "Invalid theme" });

    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ msg: "Room not found" });

    const isMember = room.members.some(m => m.toString() === req.user.id);
    if (!isMember) return res.status(403).json({ msg: "Only members can change theme" });

    room.theme = theme;
    await room.save();

    // Real-time theme update for all group members (if using socket.io)
    if (global.io) {
      global.io.to(room._id.toString()).emit("theme_updated", { roomId: room._id.toString(), theme });
    }

    res.json({ msg: "Theme updated", theme });
  } catch (err) {
    res.status(500).json({ msg: "Failed to update theme", error: err.message });
  }
});

module.exports = router;
