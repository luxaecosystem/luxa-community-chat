const path = require("path");
const http = require("http");
const express = require("express");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const moment = require("moment");
require("dotenv").config();

const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
} = require("./utils/users");

// Connessione a MongoDB
const mongoUri = process.env.MONGODB_URI;
mongoose
  .connect(mongoUri, { dbName: process.env.MONGODB_DB_NAME || "luxa" })
  .then(() => console.log("MongoDB connected successfully."))
  .catch((err) => console.error("MongoDB connection error:", err));

// Schema per i messaggi della chat
const chatMessageSchema = new mongoose.Schema({
  room: { type: String, required: true, index: true },
  username: { type: String, required: true },
  text: { type: String, required: true },
  time: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 7 }, // Pulizia automatica dopo 7 giorni
});
const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);

const app = express();
app.use(cors({ origin: "*" }));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

const server = http.createServer(app);

// Abilita esplicitamente polling e websocket
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ["polling", "websocket"],
  allowEIO3: true
});

const botName = "LUXA Bot";

io.on("connection", (socket) => {
  // Ingresso in stanza
  socket.on("joinRoom", async ({ username, room, code }) => {
    const user = userJoin(socket.id, username, room);
    user.code = code || "un";
    socket.join(user.room);

    // Recupera gli ultimi 50 messaggi della stanza dal database
    try {
      const history = await ChatMessage.find({ room: user.room })
        .sort({ createdAt: 1 })
        .limit(50);
      socket.emit("chatHistory", history);
    } catch (e) {
      console.error("Error fetching history:", e);
    }

    // Messaggio di sistema di benvenuto
    socket.emit("message", {
      username: botName,
      text: `Connected to [${user.room}] community.`,
      time: moment().format("HH:mm")
    });

    socket.broadcast.to(user.room).emit("message", {
      username: botName,
      text: `${user.username} entered the room`,
      time: moment().format("HH:mm")
    });

    io.to(user.room).emit("roomUsers", {
      room: user.room,
      users: getRoomUsers(user.room),
    });
  });

  // Ricezione e salvataggio nuovo messaggio
  socket.on("chatMessage", async (msg) => {
    const user = getCurrentUser(socket.id);
    if (!user || !msg.trim()) return;

    const messageData = {
      room: user.room,
      username: user.username,
      text: msg.trim(),
      time: moment().format("HH:mm")
    };

    try {
      await ChatMessage.create(messageData);
    } catch (err) {
      console.error("Error saving message:", err);
    }

    io.to(user.room).emit("message", messageData);
  });

  // Disconnessione
  socket.on("disconnect", () => {
    const user = userLeave(socket.id);
    if (user) {
      io.to(user.room).emit("message", {
        username: botName,
        text: `${user.username} left the room`,
        time: moment().format("HH:mm")
      });

      io.to(user.room).emit("roomUsers", {
        room: user.room,
        users: getRoomUsers(user.room),
      });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`LUXA Core & Chat Server running on port ${PORT}`));