
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

const corsOptions = {
  origin: "https://bepoli.onrender.com",
  methods: ["POST"],
  allowedHeaders: ["Content-Type", "Authorization"]
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

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

app.use(express.json());

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

app.post("/api/ricevi-dati", (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token mancante" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("✅ Dati ricevuti da bepoli.onrender.com:", decoded);
    return res.status(200).json({ ricevuto: true, utente: decoded });
  } catch (error) {
    return res.status(403).json({ message: "Token non valido", error: error.message });
  }
});

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

const db = mongoose.connection;
db.once("open", () => {
  console.log("📡 Database connesso");
  const roomCollection = db.collection("rooms");
  const changeStream = roomCollection.watch();

  changeStream.on("change", async (change) => {
    if (change.operationType === "update") {
      const updatedFields = change.updateDescription.updatedFields;

      if (updatedFields && Object.keys(updatedFields).some((key) => key.startsWith("messages"))) {
        console.log("🟢 Nuovo messaggio rilevato");
        const roomId = change.documentKey._id.toString();

        try {
          const room = await Rooms.findById(roomId);
          const lastMessage = room.messages.at(-1);

          if (lastMessage) {
            PusherClient.trigger(`room_${roomId}`, "inserted", {
              roomId,
              message: lastMessage,
            });
          }
        } catch (err) {
          console.error("❌ Errore recupero stanza per ChangeStream:", err);
        }
      }
    }
  });

  changeStream.on("error", (err) => {
    console.error("❌ Errore ChangeStream:", err);
  });
});

const PusherClient = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: "eu",
  useTLS: true,
});

app.get("/", (req, res) => {
  res.status(200).send("🌐 API Bepoliby attiva sulla root");
});

app.get("/api", (req, res) => {
  res.status(200).send("🎉 Benvenuto sul Server");
});

app.get("/api/v1/rooms", authenticateToken, async (req, res) => {
  const userUid = req.user.uid;
  try {
    const data = await Rooms.find({ members: userUid }).sort({ lastMessageTimestamp: -1 });
    res.status(200).send(data);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.post("/api/v1/rooms", authenticateToken, async (req, res) => {
  try {
    const { name, members } = req.body;
    if (!name || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ error: "Missing room name or members array" });
    }
    if (!members.includes(req.user.uid)) members.push(req.user.uid);

    const roomData = {
      name,
      members,
      messages: [],
      lastMessageTimestamp: null,
    };

    const data = await Rooms.create(roomData);
    res.status(201).send(data);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.get("/api/v1/rooms/:id", authenticateToken, async (req, res) => {
  const userUid = req.user.uid;
  try {
    const room = await Rooms.findById(req.params.id);
    if (!room) return res.status(404).json({ message: "Room not found" });
    if (!room.members.includes(userUid)) return res.status(403).json({ message: "Access denied" });
    res.status(200).json(room);
  } catch (err) {
    res.status(500).json({ message: "Errore nel recupero della stanza" });
  }
});

app.get("/api/v1/rooms/:id/messages", authenticateToken, async (req, res) => {
  const userUid = req.user.uid;
  try {
    const room = await Rooms.findById(req.params.id);
    if (!room) return res.status(404).json({ message: "Room not found" });
    if (!room.members.includes(userUid)) return res.status(403).json({ message: "Access denied" });
    res.status(200).json(room.messages || []);
  } catch (err) {
    res.status(500).json({ message: "Errore nel recupero dei messaggi" });
  }
});

app.post("/api/v1/rooms/:id/messages", authenticateToken, async (req, res) => {
  const roomId = req.params.id;
  const dbMessage = req.body;
  const userUid = req.user.uid;

  if (userUid !== dbMessage.uid) return res.status(403).json({ message: "UID mismatch" });
  dbMessage.timestamp = new Date(dbMessage.timestamp);

  try {
    const room = await Rooms.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });
    if (!room.members.includes(userUid)) return res.status(403).json({ message: "Access denied" });

    room.messages.push(dbMessage);
    room.lastMessageTimestamp = dbMessage.timestamp;
    await room.save();

    PusherClient.trigger(`room_${roomId}`, "inserted", {
      roomId,
      message: dbMessage,
    });

    res.status(201).json(dbMessage);
  } catch (err) {
    res.status(500).json({ message: "Errore nel salvataggio del messaggio" });
  }
});

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../bepoliby-fe/build")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../bepoliby-fe/build", "index.html"));
  });
}

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err);
});

const server = app.listen(port, () => {
  console.log(`🚀 Server in ascolto sulla porta ${port}`);
});

server.keepAliveTimeout = 120000;
server.headersTimeout = 121000;

