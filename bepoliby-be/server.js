
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
const Pusher = require('pusher');
const jwt = require('jsonwebtoken');
const verifyToken = require('./verifyToken');

const Rooms = require('./model/dbRooms');
const Utente = require('./model/dbUser')
const app = express();

app.use(express.json());

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: [
          "'self'",
          "https://*.pusher.com",
          "wss://*.pusher.com",
          "ws://localhost:9000",
          "http://localhost:9000",
          "https://bepoliby-1-2.onrender.com"
        ],
        imgSrc: ["'self'", "data:", "blob:"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  })
);

app.use(
  cors({
    origin: ["http://localhost:3000", "https://bepoliby-1-2.onrender.com"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

mongoose
  .connect(process.env.MONGO_URI, { dbName: "messaging-db" })
  .then(() => {
    console.log("MongoDB connected");
    app.listen(process.env.PORT || 9000, () =>
      console.log("Server running on port", process.env.PORT || 9000)
    );
  })
  .catch((err) => console.log("MongoDB connection error:", err));

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
});

// --- ROUTES ---

// Get all users (protected)
app.get("/api/v1/users", verifyToken, async (req, res) => {
  try {
    const users = await User.find({}, "_id nome username");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error fetching users" });
  }
});

// Get all rooms for the logged-in user
app.get("/api/v1/rooms", verifyToken, async (req, res) => {
  try {
    const rooms = await Room.find({
      members: req.user.uid,
    })
      .populate("members", "_id nome username")
      .sort({ lastMessageTimestamp: -1 });
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: "Server error fetching rooms" });
  }
});

// Create new room (chat) with members
app.post("/api/v1/rooms", verifyToken, async (req, res) => {
  const { members, name } = req.body;

  if (!members || !Array.isArray(members) || members.length < 2) {
    return res.status(400).json({ message: "Invalid members array" });
  }

  try {
    // Evita duplicati di stanze con gli stessi membri (ordina e compara)
    const sortedMembers = [...members].sort();
    const existingRoom = await Room.findOne({
      members: { $all: sortedMembers, $size: sortedMembers.length },
    });

    if (existingRoom) {
      return res.status(200).json(existingRoom);
    }

    const newRoom = new Room({
      members: sortedMembers,
      name,
      lastMessageTimestamp: new Date(),
      messages: [],
    });

    const savedRoom = await newRoom.save();

    // Popola members per inviare stanza "pulita"
    const populatedRoom = await savedRoom.populate("members", "_id nome username");

    res.status(201).json(populatedRoom);
  } catch (error) {
    res.status(500).json({ message: "Server error creating room" });
  }
});

// Get a single room by ID, only if user is member
app.get("/api/v1/rooms/:roomId", verifyToken, async (req, res) => {
  try {
    const room = await Room.findOne({
      _id: req.params.roomId,
      members: req.user.uid,
    }).populate("members", "_id nome username");

    if (!room) {
      return res.status(404).json({ message: "Room not found or access denied" });
    }

    res.json(room);
  } catch (error) {
    res.status(500).json({ message: "Server error fetching room" });
  }
});

// Post a new message in a room
app.post("/api/v1/rooms/:roomId/messages", verifyToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { message } = req.body;

    if (!message || message.trim() === "") {
      return res.status(400).json({ message: "Message cannot be empty" });
    }

    // Trova la stanza e verifica accesso
    const room = await Room.findOne({
      _id: roomId,
      members: req.user.uid,
    }).populate("members", "_id nome username");

    if (!room) {
      return res.status(404).json({ message: "Room not found or access denied" });
    }

    // Nuovo messaggio
    const newMessage = {
      message,
      name: req.user.nome,
      uid: req.user.uid,
      timestamp: new Date(),
    };

    room.messages.push(newMessage);
    room.lastMessageTimestamp = newMessage.timestamp;

    await room.save();

    // Normalizza stanza per Pusher: solo campi necessari
    const roomForPusher = {
      _id: room._id.toString(),
      name: room.name,
      members: room.members.map((m) => ({
        _id: m._id.toString(),
        nome: m.nome,
        username: m.username,
      })),
      lastMessageTimestamp: room.lastMessageTimestamp,
    };

    // Trigger Pusher
    await pusher.trigger("rooms", "new-message", {
      room: roomForPusher,
      message: newMessage,
    });

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error posting message:", error);
    res.status(500).json({ message: "Server error posting message" });
  }
});

export default app;





