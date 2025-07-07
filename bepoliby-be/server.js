require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
const Pusher = require('pusher');
const verifyToken = require('./verifyToken');

const Rooms = require('./model/dbRooms');
const Utente = require('./model/dbUser');

const app = express();
const port = process.env.PORT || 9000;

app.use(express.json());

const allowedOrigins = [
  "https://bepoli.onrender.com",
  "https://bepoliby-1.onrender.com",
  "https://bepoliby-1-2.onrender.com",
  "http://localhost:3000"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Origin non consentita: " + origin));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: [
        "'self'",
        ...allowedOrigins,
        "https://*.pusher.com",
        "wss://*.pusher.com"
      ],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://js.pusher.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      frameSrc: ["'self'"]
    }
  }
}));

app.use(session({
  secret: process.env.SESSION_SECRET || "supersecret",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

const PusherClient = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: "eu",
  useTLS: true,
});

app.post("/pusher/auth", verifyToken, (req, res) => {
  const socketId = req.body.socket_id;
  const channel = req.body.channel_name;
  const auth = PusherClient.authenticate(socketId, channel, {});
  res.send(auth);
});

app.get("/", (req, res) => res.send("🌐 API Bepoliby attiva"));

// Endpoint per fornire immagine profilo come file binario
app.get("/api/v1/users/:id/profile-pic", verifyToken, async (req, res) => {
  try {
    const utente = await Utente.findById(req.params.id).select("profilePic");
    if (!utente || !utente.profilePic || !utente.profilePic.data) {
      return res.status(404).send("Immagine profilo non trovata");
    }
    res.set("Content-Type", utente.profilePic.contentType);
    res.send(utente.profilePic.data);
  } catch (err) {
    console.error("Errore recupero immagine profilo:", err);
    res.status(500).send("Errore server");
  }
});

// Lista utenti base con URL immagine profilo
app.get("/api/v1/users", verifyToken, async (req, res) => {
  try {
    const users = await Utente.find({}, { _id: 1, nome: 1, username: 1 });
    const usersWithPicUrl = users.map(u => ({
      _id: u._id,
      nome: u.nome,
      username: u.username,
      profilePicUrl: `/api/v1/users/${u._id}/profile-pic`
    }));
    res.status(200).json(usersWithPicUrl);
  } catch (err) {
    console.error("Errore recupero utenti:", err);
    res.status(500).json({ error: "Errore nel recupero utenti" });
  }
});

// Ricerca utenti
app.get("/api/v1/users/search", verifyToken, async (req, res) => {
  try {
    const q = req.query.q || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const regex = new RegExp(q, "i");

    const filter = {
      $or: [{ nome: regex }, { username: regex }],
    };

    const total = await Utente.countDocuments(filter);

    const results = await Utente.find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .select("_id nome username")
      .exec();

    // aggiungo URL immagine profilo
    const resultsWithPicUrl = results.map(u => ({
      _id: u._id,
      nome: u.nome,
      username: u.username,
      profilePicUrl: `/api/v1/users/${u._id}/profile-pic`
    }));

    res.json({ results: resultsWithPicUrl, total });
  } catch (err) {
    console.error("Errore ricerca utenti:", err);
    res.status(500).json({ error: "Errore interno server" });
  }
});

// (Resto delle API invariato...)

app.get("/api/v1/rooms", verifyToken, async (req, res) => {
  try {
    const rooms = await Rooms.find({ members: req.user.uid })
      .populate("members", "nome username")
      .sort({ lastMessageTimestamp: -1 });

    res.status(200).json(rooms);
  } catch (err) {
    console.error("❌ Errore nel recupero stanze:", err);
    res.status(500).json({ error: "Errore nel recupero stanze" });
  }
});

app.get("/api/v1/rooms/:roomId", verifyToken, async (req, res) => {
  try {
    const room = await Rooms.findById(req.params.roomId).populate(
      "members",
      "nome username"
    );

    if (!room) return res.status(404).json({ error: "Stanza non trovata" });

    const isMember = room.members.some(
      (member) => member._id.toString() === req.user.uid
    );
    if (!isMember) return res.status(403).json({ error: "Accesso negato" });

    res.status(200).json(room);
  } catch (err) {
    console.error("Errore recupero stanza:", err);
    res.status(500).json({ error: "Errore nel recupero stanza" });
  }
});

app.post("/api/v1/rooms", verifyToken, async (req, res) => {
  const { name, members } = req.body;

  if (!Array.isArray(members) || members.length < 2) {
    return res.status(400).json({ message: "La stanza deve avere almeno due membri" });
  }

  try {
    const sortedMembers = members
      .map((id) => new mongoose.Types.ObjectId(id))
      .sort((a, b) => a.toString().localeCompare(b.toString()));

    const existingRooms = await Rooms.find({
      members: { $all: sortedMembers, $size: sortedMembers.length },
    });

    const exactRoom = existingRooms.find((room) => {
      const roomMembersSorted = room.members.map((m) => m.toString()).sort();
      return (
        JSON.stringify(roomMembersSorted) ===
        JSON.stringify(sortedMembers.map((m) => m.toString()))
      );
    });

    if (exactRoom) return res.status(200).json(exactRoom);

    const newRoom = new Rooms({
      name: name || null,
      members: sortedMembers,
      messages: [],
      lastMessageTimestamp: new Date(),
    });

    await newRoom.save();
    res.status(201).json(newRoom);
  } catch (err) {
    console.error("❌ Errore creazione stanza:", err);
    res.status(500).json({ message: "Errore interno nella creazione stanza" });
  }
});

app.post("/api/v1/rooms/:roomId/messages", verifyToken, async (req, res) => {
  const { roomId } = req.params;
  const { message } = req.body;

  if (!message) return res.status(400).json({ error: "Messaggio mancante" });

  try {
    const room = await Rooms.findById(roomId);
    if (!room) return res.status(404).json({ error: "Stanza non trovata" });

    const isMember = room.members.some(
      (member) => member.toString() === req.user.uid
    );
    if (!isMember) return res.status(403).json({ error: "Accesso negato" });

    const newMessage = {
      message,
      name: req.user.nome || req.user.username || "Anonimo",
      timestamp: new Date(),
      uid: req.user.uid.toString(),
    };

    room.messages.push(newMessage);
    room.lastMessageTimestamp = newMessage.timestamp;
    await room.save();

    await room.populate("members", "nome username");

    const simplifiedRoom = {
      _id: room._id.toString(),
      name: room.name,
      members: room.members.map((m) => ({
        _id: m._id.toString(),
        nome: m.nome,
        username: m.username,
      })),
      lastMessageText: newMessage.message,
      lastMessageTimestamp: newMessage.timestamp,
    };

    console.log("📡 Trigger su Pusher per chat e sidebar");

    // Trigger per chat attiva
    await PusherClient.trigger(`room_${roomId}`, "inserted", {
      roomId,
      message: newMessage,
    });

    // Trigger per sidebar
    await PusherClient.trigger("rooms", "new-message", {
      room: simplifiedRoom,
      message: newMessage,
    });

    res.status(201).json(newMessage);
  } catch (err) {
    console.error("❌ Errore inserimento messaggio:", err);
    res.status(500).json({ error: "Errore interno nel salvataggio messaggio" });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server attivo su porta ${port}`);
});
