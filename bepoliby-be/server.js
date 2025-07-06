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
const Utente = require('./model/dbUser');

const app = express();
const port = process.env.PORT || 9000;

// === Middleware ===
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
        "https://bepoliby-1.onrender.com",
        "https://bepoliby-1-2.onrender.com",
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

const db = mongoose.connection;
db.once("open", () => {
  const roomCollection = db.collection("rooms");
  const changeStream = roomCollection.watch();

  changeStream.on("change", async (change) => {
    if (change.operationType === "update") {
      const updatedFields = change.updateDescription.updatedFields;
      if (Object.keys(updatedFields).some(key => key.startsWith("messages"))) {
        const roomId = change.documentKey._id.toString();
        const room = await Rooms.findById(roomId);
        const lastMessage = room.messages.at(-1);
        if (lastMessage) {
          PusherClient.trigger(`room_${roomId}`, "inserted", { roomId, message: lastMessage });
        }
      }
    }
  });

  changeStream.on("error", (err) => {
    console.error("❌ ChangeStream error:", err);
  });
});

// === ROUTES ===

app.get("/", (req, res) => res.send("🌐 API Bepoliby attiva"));

app.get('/api/user-photo/:userId', async (req, res) => {
  try {
    const user = await Utente.findById(req.params.userId);
    if (!user || !user.profilePic || !user.profilePic.data) {
      return res.status(404).send('No image');
    }
    res.set('Content-Type', user.profilePic.contentType);
    res.send(user.profilePic.data);
  } catch (err) {
    res.status(500).send('Errore server');
  }
});

app.get("/api/auth-token", (req, res) => {
  const sessionUser = req.session?.user;
  if (!sessionUser || !sessionUser._id || !sessionUser.username) {
    return res.status(401).json({ message: "Utente non autenticato" });
  }

  const token = jwt.sign({
    id: sessionUser._id.toString(),
    nome: sessionUser.nome,
    username: sessionUser.username
  }, process.env.JWT_SECRET, { expiresIn: "1h" });

  res.json({ token });
});

app.get("/api/v1/users/search", async (req, res) => {
  const query = req.query.q;
  let page = parseInt(req.query.page) || 1;
  let limit = parseInt(req.query.limit) || 10;

  if (!query) return res.status(400).json({ message: "Query mancante" });
  if (page < 1) page = 1;
  if (limit < 1) limit = 10;

  const skip = (page - 1) * limit;

  try {
    const regex = new RegExp(query, 'i');
    const total = await Utente.countDocuments({
      $or: [{ username: regex }, { nome: regex }]
    });

    const results = await Utente.find(
      { $or: [{ username: regex }, { nome: regex }] },
      'username nome _id'
    )
      .skip(skip)
      .limit(limit);

    res.json({
      page,
      limit,
      total,
      results: results.map(u => ({
        id: u._id,
        username: u.username,
        nome: u.nome,
        profilePicUrl: `/api/user-photo/${u._id}`
      }))
    });
  } catch (err) {
    console.error("❌ Errore ricerca utenti:", err);
    res.status(500).json({ message: "Errore ricerca" });
  }
});

app.get("/api/v1/users", async (req, res) => {
  try {
    const users = await Utente.find({}, { _id: 1, nome: 1, username: 1 });
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: "Errore nel recupero utenti" });
  }
});

app.get("/api/v1/rooms", verifyToken, async (req, res) => {
  try {
    const data = await Rooms.find({ members: req.user.uid })
      .populate('members', 'nome username')
      .sort({ lastMessageTimestamp: -1 });
    res.status(200).send(data);
  } catch (err) {
    console.error("❌ Errore nel recupero stanze:", err);
    res.status(500).json({ error: "Errore nel recupero stanze" });
  }
});

app.get("/api/v1/rooms/:roomId", verifyToken, async (req, res) => {
  try {
    const room = await Rooms.findById(req.params.roomId);
    if (!room) return res.status(404).json({ error: "Stanza non trovata" });
    if (!room.members.includes(req.user.uid)) return res.status(403).json({ error: "Accesso negato" });
    res.status(200).json(room);
  } catch (err) {
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
      .map(id => new mongoose.Types.ObjectId(id))
      .sort((a, b) => a.toString().localeCompare(b.toString()));

    const existingRoom = await Rooms.findOne({
      members: { $all: sortedMembers, $size: sortedMembers.length }
    });

    if (existingRoom) {
      return res.status(200).json(existingRoom);
    }

    const newRoom = new Rooms({
      name: name || null,
      members: sortedMembers,
      messages: [],
      lastMessageTimestamp: new Date()
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

    if (!room.members.includes(req.user.uid)) {
      return res.status(403).json({ error: "Accesso negato" });
    }

    const newMessage = {
      message,
      name: req.user.nome || req.user.username || "Anonimo",
      timestamp: new Date(),
      uid: req.user.uid,
    };

    room.messages.push(newMessage);
    room.lastMessageTimestamp = new Date();

    await room.save();

    res.status(201).json(newMessage);

    // Evento per la room specifica 
    PusherClient.trigger(`room_${roomId}`, "inserted", {
      roomId,
      message: newMessage
    });

    // 🔥 Evento globale per la Sidebar
    PusherClient.trigger("rooms", "new-message", {
      roomId,
      message: newMessage
    });

  } catch (err) {
    console.error("❌ Errore messaggio:", err);
    res.status(500).json({ error: "Errore interno nel salvataggio del messaggio" });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🌐 Server in esecuzione su http://localhost:${port}`);
});

