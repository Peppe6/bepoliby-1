
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Rooms = require('./model/dbRooms');
const Pusher = require('pusher');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 9000;

// 🌍 Lista domini frontend autorizzati
const allowedOrigins = [
  "https://bepoli.onrender.com",
  "https://bepoliby-1.onrender.com",
  "https://bepoliby-1-2.onrender.com",
  "http://localhost:3000"
];

// 🌐 CORS automatico
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, origin);
    } else {
      callback(new Error(`Origin ${origin} non permessa dal CORS`));
    }
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// 🔐 Fix CORS manuale per il preflight OPTIONS
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// 🛡 Helmet con Content-Security-Policy
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
      ],
    },
  })
);

// 📦 JSON body parser
app.use(express.json());

// 🔐 Middleware JWT
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

// 🔗 API che riceve dati da dominio esterno
app.post("/api/ricevi-dati", (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token mancante" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("✅ Dati ricevuti da dominio esterno:", decoded);
    return res.status(200).json({ ricevuto: true, utente: decoded });
  } catch (error) {
    return res.status(403).json({ message: "Token non valido", error: error.message });
  }
});

// 🔌 Connessione MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// 🔁 ChangeStream per Pusher
const db = mongoose.connection;
db.once("open", () => {
  console.log("📡 Database connesso");

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

// 🔔 Pusher config
const PusherClient = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: "eu",
  useTLS: true,
});

// 🌐 ROUTE API
app.get("/", (req, res) => res.send("🌐 API Bepoliby attiva sulla root"));
app.get("/api", (req, res) => res.send("🎉 Benvenuto sul Server"));

// 📁 API CRUD Rooms e Messaggi
app.get("/api/v1/rooms", authenticateToken, async (req, res) => {
  const userUid = req.user.uid;
  const data = await Rooms.find({ members: userUid }).sort({ lastMessageTimestamp: -1 });
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
  const userUid = req.user.uid;
  const room = await Rooms.findById(req.params.id);
  if (!room) return res.status(404).json({ message: "Room not found" });
  if (!room.members.includes(userUid)) return res.status(403).json({ message: "Access denied" });
  res.status(200).json(room);
});

app.get("/api/v1/rooms/:id/messages", authenticateToken, async (req, res) => {
  const userUid = req.user.uid;
  const room = await Rooms.findById(req.params.id);
  if (!room) return res.status(404).json({ message: "Room not found" });
  if (!room.members.includes(userUid)) return res.status(403).json({ message: "Access denied" });
  res.status(200).json(room.messages || []);
});

app.post("/api/v1/rooms/:id/messages", authenticateToken, async (req, res) => {
  const userUid = req.user.uid;
  const dbMessage = req.body;
  dbMessage.timestamp = new Date(dbMessage.timestamp);
  if (userUid !== dbMessage.uid) return res.status(403).json({ message: "UID mismatch" });

  const room = await Rooms.findById(req.params.id);
  if (!room) return res.status(404).json({ message: "Room not found" });
  if (!room.members.includes(userUid)) return res.status(403).json({ message: "Access denied" });

  room.messages.push(dbMessage);
  room.lastMessageTimestamp = dbMessage.timestamp;
  await room.save();

  PusherClient.trigger(`room_${req.params.id}`, "inserted", { roomId: req.params.id, message: dbMessage });
  res.status(201).json(dbMessage);
});

// 🧱 Serve frontend build (solo in produzione)
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../bepoliby-fe/build")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../bepoliby-fe/build", "index.html"));
  });
}

// 🧯 Gestione errori
process.on("uncaughtException", err => console.error("❌ Uncaught Exception:", err));
process.on("unhandledRejection", err => console.error("❌ Unhandled Rejection:", err));

// 🚀 Avvio server
const server = app.listen(port, () => {
  console.log(`🚀 Server in ascolto sulla porta ${port}`);
});
server.keepAliveTimeout = 120000;
server.headersTimeout = 121000;
