const express = require("express");
const User = require("../models/User");
const auth = require("../middleware/auth");

const router = express.Router();

// List all users (basic info only)
router.get("/", async (req, res) => {
  const users = await User.find({}, "firstName lastName email");
  res.json(users);
});

// Get info for the currently authenticated user (excludes password)
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ msg: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ msg: "Failed to fetch user", error: err.message });
  }
});

// Get all notifications for the current user, with chat navigation links if relevant
router.get("/notifications", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate("notifications.fromUser", "firstName lastName")
      .populate("notifications.roomId", "name");

    // Newest notifications first
    const sorted = user.notifications.sort(
      (a, b) => b.createdAt - a.createdAt
    );

    // Add chat navigation path for relevant notification types
    const withPath = sorted.map((notif) => {
      let path = "/dashboard";
      if (notif.type === "message" || notif.type === "new_message") {
        const rid =
          typeof notif.roomId === "string" ? notif.roomId : notif.roomId?._id;
        path = `/chat/${rid}`;
      }
      return {
        _id: notif._id,
        type: notif.type,
        message: notif.message,
        isRead: notif.isRead,
        createdAt: notif.createdAt,
        fromUser: notif.fromUser,
        roomId: notif.roomId,
        path,
      };
    });

    res.json(withPath);
  } catch (err) {
    res
      .status(500)
      .json({ msg: "Failed to load notifications", error: err.message });
  }
});

// Mark a notification as read (by notification ID)
router.post("/notifications/:id/read", auth, async (req, res) => {
  try {
    const notifId = req.params.id;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const notif = user.notifications.id(notifId);
    if (!notif) return res.status(404).json({ msg: "Notification not found" });

    notif.isRead = true;
    await user.save();
    res.json({ msg: "Notification marked as read" });
  } catch (err) {
    res
      .status(500)
      .json({ msg: "Failed to update notification", error: err.message });
  }
});

// Delete the current user’s account
router.delete("/delete", auth, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user.id);
    res.json({ msg: "User deleted" });
  } catch (err) {
    res.status(500).json({ msg: "Failed to delete user", error: err.message });
  }
});

// Update user theme preferences (background, textColor, accentColor)
router.put("/theme", auth, async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { theme: req.body }, // e.g., { background: "#fff", textColor: "#000", accentColor: "#f00" }
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ msg: "User not found" });
    }

    res.json(updatedUser.theme);
  } catch (err) {
    res
      .status(500)
      .json({ msg: "Failed to update theme", error: err.message });
  }
});

module.exports = router;
