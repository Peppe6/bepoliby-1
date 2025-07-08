
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

// ✅ Immagine profilo - PUBBLICA
app.get("/api/v1/users/:id/profile-pic", async (req, res) => {
  try {
    const utente = await Utente.findById(req.params.id).select("profilePic");
    if (!utente || !utente.profilePic || !utente.profilePic.data) {
      return res.status(404).send("Immagine profilo non trovata");
    }
    res.set("Content-Type", utente.profilePic.contentType);
    res.set("Cache-Control", "public, max-age=86400"); // 1 giorno
    res.send(utente.profilePic.data);
  } catch (err) {
    console.error("Errore recupero immagine profilo:", err);
    res.status(500).send("Errore server");
  }
});

// ✅ Elenco utenti con profilePicUrl ASSOLUTO
app.get("/api/v1/users", verifyToken, async (req, res) => {
  try {
    const utenti = await Utente.find().select("_id nome username profilePic");
    const utentiConFoto = utenti.map(u => ({
      _id: u._id,
      nome: u.nome,
      username: u.username,
      profilePicUrl: u.profilePic?.data
        ? `${req.protocol}://${req.get("host")}/api/v1/users/${u._id}/profile-pic`
        : null,
    }));
    res.status(200).json(utentiConFoto);
  } catch (err) {
    console.error("❌ Errore nel recupero utenti:", err);
    res.status(500).json({ error: "Errore interno nel recupero utenti" });
  }
});

// ✅ Ricerca utenti con profilePicUrl ASSOLUTO
app.get("/api/v1/users/search", verifyToken, async (req, res) => {
  try {
    const q = req.query.q || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const regex = new RegExp(q, "i");
    const filter = {
      $or: [{ nome: regex }, { username: regex }]
    };

    const total = await Utente.countDocuments(filter);

    const results = await Utente.find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .select("_id nome username profilePic");

    const resultsWithPicUrl = results.map(u => ({
      _id: u._id,
      nome: u.nome,
      username: u.username,
      profilePicUrl: u.profilePic?.data
        ? `${req.protocol}://${req.get("host")}/api/v1/users/${u._id}/profile-pic`
        : null,
    }));

    res.json({ results: resultsWithPicUrl, total });
  } catch (err) {
    console.error("Errore ricerca utenti:", err);
    res.status(500).json({ error: "Errore interno server" });
  }
});

// ✅ Recupera stanze
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

// ✅ Recupera singola stanza
app.get("/api/v1/rooms/:roomId", verifyToken, async (req, res) => {
  try {
    const room = await Rooms.findById(req.params.roomId).populate("members", "nome username");
    if (!room) return res.status(404).json({ error: "Stanza non trovata" });

    const isMember = room.members.some(m => m._id.toString() === req.user.uid);
    if (!isMember) return res.status(403).json({ error: "Accesso negato" });

    res.status(200).json(room);
  } catch (err) {
    console.error("Errore recupero stanza:", err);
    res.status(500).json({ error: "Errore nel recupero stanza" });
  }
});

// ✅ Crea stanza (evita duplicati)
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

    const exactRoom = existingRooms.find(room => {
      const roomSorted = room.members.map(m => m.toString()).sort();
      return JSON.stringify(roomSorted) === JSON.stringify(sortedMembers.map(m => m.toString()));
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

// ✅ Invia messaggio
app.post("/api/v1/rooms/:roomId/messages", verifyToken, async (req, res) => {
  const { roomId } = req.params;
  const { message } = req.body;

  if (!message) return res.status(400).json({ error: "Messaggio mancante" });

  try {
    const room = await Rooms.findById(roomId);
    if (!room) return res.status(404).json({ error: "Stanza non trovata" });

    const isMember = room.members.some(m => m.toString() === req.user.uid);
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
      members: room.members.map(m => ({
        _id: m._id.toString(),
        nome: m.nome,
        username: m.username
      })),
      lastMessageText: newMessage.message,
      lastMessageTimestamp: newMessage.timestamp
    };

    await PusherClient.trigger(`room_${roomId}`, "inserted", {
      roomId,
      message: newMessage,
    });

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
