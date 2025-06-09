const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const Message = require("./models/Message");
const User = require("./models/User");
const Room = require("./models/Room");

const app = express();
const server = http.createServer(app);
const { Server } = require("socket.io");

app.use(cors());
app.use(express.json());

// --- Route setup ---
const authRoutes = require("./routes/auth");
const messageRoutes = require("./routes/messages");
const userRoutes = require("./routes/users");
const roomRoutes = require("./routes/rooms");

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);
app.use("/api/rooms", roomRoutes);

// --- MongoDB connection ---
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

// --- Socket.IO setup ---
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

global.io = io;

const userSocketMap = {}; // Keeps track of connected users

io.on("connection", (socket) => {
  console.log("🔌 Connected:", socket.id);

  // When a user logs in, register their socket and join their private room for notifications
  socket.on("register", (userId) => {
    userSocketMap[userId] = socket.id;
    socket.join(userId);
    console.log(`✅ Registered user: ${userId}`);
  });

  // User joins a chat room (group chat)
  socket.on("join_room", (roomId) => {
    socket.join(roomId);
    console.log(`👥 User joined room: ${roomId}`);
  });

  // When a user sends a message, broadcast it to everyone in the room
  socket.on("send_message", async (data) => {
    const { sender, receiver, roomId, message } = data;

    try {
      const newMsg = new Message({ sender, receiver, room: roomId, message });
      await newMsg.save();

      io.to(roomId).emit("receive_message", newMsg);

      // Notify the receiver if they’re online
      if (receiver && userSocketMap[receiver]) {
        io.to(userSocketMap[receiver]).emit("notification", {
          type: "new_message",
          roomId,
          from: sender,
          message: "New message in room"
        });
      }
    } catch (err) {
      console.error("❌ Error saving message:", err.message);
    }
  });

  // When the theme changes in a room, notify all members in real time
  socket.on("theme_update", ({ roomId, theme }) => {
    io.to(roomId).emit("theme_updated", { roomId, theme });
    console.log(`🎨 Theme updated in room ${roomId}: ${theme}`);
  });

  // Notify admin when a user requests to join a private room
  socket.on("join_request_notification", async ({ toUserId, roomId, fromUser }) => {
    try {
      const room = await Room.findById(roomId);
      if (!room) return;

      const message = `${fromUser.firstName} requested to join "${room.name}"`;

      if (userSocketMap[toUserId]) {
        io.to(userSocketMap[toUserId]).emit("notification", {
          type: "join_request",
          roomId,
          fromUser,
          message
        });
      }
    } catch (err) {
      console.error("❌ Join request notify error:", err.message);
    }
  });

  // Clean up when a user disconnects
  socket.on("disconnect", () => {
    console.log("❌ Disconnected:", socket.id);
    for (const userId in userSocketMap) {
      if (userSocketMap[userId] === socket.id) {
        delete userSocketMap[userId];
        break;
      }
    }
  });
});

// --- Start the server ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
