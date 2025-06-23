
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Rooms = require('./model/dbRooms');
const User = require('./model/dbUser');    // import User model
const Pusher = require('pusher');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 9000;

const allowedOrigins = [
  "https://bepoli.onrender.com",
  "https://bepoliby-1.onrender.com",
  "https://bepoliby-1-2.onrender.com",
  "http://localhost:3000"
];

const corsOptions = {
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
};

// Middleware
app.use(cors(corsOptions));
app.use(helmet());
app.use(express.json());

// Helmet CSP
app.use(
  helmet.contentSecurityPolicy({
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "https://translate.google.com",
        "https://www.gstatic.com",
        "https://apis.google.com",
        "'unsafe-inline'",
      ],
      styleSrc: [
        "'self'",
        "https://fonts.googleapis.com",
        "https://translate.googleapis.com",
        "https://www.gstatic.com",
        "'unsafe-inline'",
      ],
      styleSrcElem: [
        "'self'",
        "https://fonts.googleapis.com",
        "https://translate.googleapis.com",
        "https://www.gstatic.com",
        "'unsafe-inline'",
      ],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: [
        "'self'",
        "data:",
        "https://www.gstatic.com",
        "https://avatars.dicebear.com",
        "https://www.gravatar.com",
        "https://render-prod-avatars.s3.us-west-2.amazonaws.com",
      ],
      connectSrc: [
        "'self'",
        "wss:",
        "https:",
        "http://localhost:3000",
        "http://localhost:9000",
        "wss://ws-eu.pusher.com"
      ],
    },
  })
);

// Preflight manuale (opzionale, ma utile)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Middleware di autenticazione JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Token mancante" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Token non valido" });
    req.user = user;
    next();
  });
}

// Endpoint ricezione dati da sito esterno (senza autenticazione qui, oppure aggiungila se serve)
app.post('/api/ricevi-dati', (req, res) => {
  const { id, username, nome, token } = req.body;
  // Qui puoi verificare il token JWT se vuoi, per sicurezza
  // es: jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => { ... })

  console.log("✅ Dati ricevuti:", { id, username, nome });
  // Logica di salvataggio o altro...
  res.status(200).json({ message: "Dati ricevuti correttamente" });
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB connected"))
.catch((err) => console.error("❌ MongoDB connection error:", err));

// ChangeStream per notifiche realtime con Pusher
const db = mongoose.connection;
db.once("open", () => {
  console.log("📡 DB connesso");
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

// Pusher setup
const PusherClient = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: "eu",
  useTLS: true,
});

// API endpoints per rooms e messaggi

app.get("/", (req, res) => res.send("🌐 API Bepoliby attiva"));
app.get("/api", (req, res) => res.send("🎉 Server attivo"));

// --- USERS endpoints ---

// Lista utenti (uid e nome/username) per sidebar e creazione chat
app.get("/api/v1/users", authenticateToken, async (req, res) => {
  const users = await User.find({}, { uid: 1, nome: 1, username: 1, _id: 0 });
  res.status(200).json(users);
});

// Cerca utente per email (es. per creare chat)
app.get("/api/v1/users/email/:email", authenticateToken, async (req, res) => {
  const email = req.params.email;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: "Utente non trovato" });
  res.status(200).json(user);
});

// --- ROOMS endpoints ---

app.get("/api/v1/rooms", authenticateToken, async (req, res) => {
  const data = await Rooms.find({ members: req.user.uid }).sort({ lastMessageTimestamp: -1 });
  res.status(200).send(data);
});

app.post("/api/v1/rooms", authenticateToken, async (req, res) => {
  const { name, members = [] } = req.body;
  if (!name) return res.status(400).json({ error: "Nome stanza mancante" });
  if (!members.includes(req.user.uid)) members.push(req.user.uid);
  const roomData = { name, members, messages: [], lastMessageTimestamp: null };
  const data = await Rooms.create(roomData);
  res.status(201).send(data);
});

app.get("/api/v1/rooms/:id", authenticateToken, async (req, res) => {
  const room = await Rooms.findById(req.params.id);
  if (!room) return res.status(404).json({ message: "Room not found" });
  if (!room.members.includes(req.user.uid)) return res.status(403).json({ message: "Access denied" });
  res.status(200).json(room);
});

app.get("/api/v1/rooms/:id/messages", authenticateToken, async (req, res) => {
  const room = await Rooms.findById(req.params.id);
  if (!room) return res.status(404).json({ message: "Room not found" });
  if (!room.members.includes(req.user.uid)) return res.status(403).json({ message: "Access denied" });
  res.status(200).json(room.messages || []);
});

app.post("/api/v1/rooms/:id/messages", authenticateToken, async (req, res) => {
  const dbMessage = req.body;
  if (req.user.uid !== dbMessage.uid) return res.status(403).json({ message: "UID mismatch" });
  dbMessage.timestamp = new Date(dbMessage.timestamp);

  const room = await Rooms.findById(req.params.id);
  if (!room) return res.status(404).json({ message: "Room not found" });
  if (!room.members.includes(req.user.uid)) return res.status(403).json({ message: "Access denied" });

  room.messages.push(dbMessage);
  room.lastMessageTimestamp = dbMessage.timestamp;
  await room.save();

  PusherClient.trigger(`room_${req.params.id}`, "inserted", { roomId: req.params.id, message: dbMessage });
  res.status(201).json(dbMessage);
});

// Serve React frontend in produzione
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../bepoliby-fe/build")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../bepoliby-fe/build", "index.html"));
  });
}

// Error handling globale
process.on("uncaughtException", err => console.error("❌ Uncaught Exception:", err));
process.on("unhandledRejection", err => console.error("❌ Unhandled Rejection:", err));

// Avvio server
const server = app.listen(port, () => {
  console.log(`🚀 Server in ascolto sulla porta ${port}`);
});
server.keepAliveTimeout = 120000;
server.headersTimeout = 121000;
