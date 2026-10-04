const path = require("path");
const http = require("http");
const express = require("express");
const { Server } = require("socket.io");
const cors = require("cors");
const formatMessage = require("./utils/messages");
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
} = require("./utils/users");
require("dotenv").config();

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const frontendDir = path.join(__dirname, "..", "frontend", "public");
app.use(express.static(frontendDir));

const botName = "LUXA Bot";

io.on("connection", (socket) => {
  socket.on("joinRoom", ({ username, room, code }) => {
    const user = userJoin(socket.id, username, room);
    user.code = code || "un";

    socket.join(user.room);

    // Benvenuto all'utente
    socket.emit("message", formatMessage(botName, `Welcome to the [${user.room}] community chat!`));

    // Notifica di ingresso
    socket.broadcast
      .to(user.room)
      .emit(
        "message",
        formatMessage(botName, `${user.username} entered the room`)
      );

    // Aggiornamento utenti
    io.to(user.room).emit("roomUsers", {
      room: user.room,
      users: getRoomUsers(user.room),
    });
  });

  socket.on("chatMessage", (msg) => {
    const user = getCurrentUser(socket.id);
    if (!user) return;

    io.to(user.room).emit("message", formatMessage(user.username, msg));
  });

  socket.on("disconnect", () => {
    const user = userLeave(socket.id);
    if (user) {
      io.to(user.room).emit(
        "message",
        formatMessage(botName, `${user.username} left the room`)
      );

      io.to(user.room).emit("roomUsers", {
        room: user.room,
        users: getRoomUsers(user.room),
      });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`LUXA Multi-Country Chat Server running on port ${PORT}`));