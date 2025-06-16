
const express = require('express');
const mongoose = require('mongoose');
const Rooms = require('./model/dbRooms'); // <-- modello aggiornato con campo members
const Pusher = require('pusher');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const app = express();
const port = process.env.PORT || 9000;

// Helmet con Content Security Policy
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
app.use(cors());

// Connessione MongoDB
const connectionDbUrl = "mongodb+srv://drankenstain:RzdXh55Ie1KzQ2wo@cluster0.rcldbiz.mongodb.net/bepoliby?retryWrites=true&w=majority&appName=Cluster0";

mongoose
  .connect(connectionDbUrl, {
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
          const lastMessage = room.messages.length > 0
            ? room.messages[room.messages.length - 1]
            : null;

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

// Config Pusher
const PusherClient = new Pusher({
  appId: "1999725",
  key: "6a10fce7f61c4c88633b",
  secret: "cb00372865ac43a1e9e8",
  cluster: "eu",
  useTLS: true,
});

// Rotte API
app.get("/", (req, res) => {
  res.status(200).send("🌐 API Bepoliby attiva sulla root");
});

app.get("/api", (req, res) => {
  res.status(200).send("🎉 Benvenuto sul Server");
});

// ✅ GET: stanze dell'utente loggato
app.get("/api/v1/rooms", async (req, res) => {
  const userUid = req.headers["x-user-uid"];

  if (!userUid) {
    return res.status(401).json({ error: "Missing user UID" });
  }

  try {
    const data = await Rooms.find({ members: userUid }).sort({ lastMessageTimestamp: -1 });
    res.status(200).send(data);
  } catch (err) {
    res.status(500).send(err);
  }
});

// ✅ POST: crea stanza con membri
app.post("/api/v1/rooms", async (req, res) => {
  try {
    console.log("📥 Richiesta creazione stanza:", req.body);

    const { name, members } = req.body;

    if (!name || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ error: "Missing room name or members array" });
    }

    const roomData = {
      name,
      members,
      messages: [],
      lastMessageTimestamp: null,
    };

    const data = await Rooms.create(roomData);
    res.status(201).send(data);
  } catch (err) {
    console.error("❌ Errore creazione stanza:", err);
    res.status(500).send(err);
  }
});

// ✅ GET: stanza per ID se utente è membro
app.get("/api/v1/rooms/:id", async (req, res) => {
  const userUid = req.headers["x-user-uid"];

  if (!userUid) {
    return res.status(401).json({ error: "Missing user UID" });
  }

  try {
    const room = await Rooms.findById(req.params.id);

    if (!room) return res.status(404).json({ message: "Room not found" });
    if (!room.members.includes(userUid)) return res.status(403).json({ message: "Access denied to this room" });

    res.status(200).json(room);
  } catch (err) {
    console.error("❌ Errore durante il recupero della stanza:", err);
    res.status(500).json({ message: "Errore nel recupero della stanza" });
  }
});

// ✅ GET: messaggi della stanza solo se utente è membro
app.get("/api/v1/rooms/:id/messages", async (req, res) => {
  const userUid = req.headers["x-user-uid"];

  if (!userUid) {
    return res.status(401).json({ error: "Missing user UID" });
  }

  try {
    const room = await Rooms.findById(req.params.id);

    if (!room) return res.status(404).json({ message: "Room not found" });
    if (!room.members.includes(userUid)) return res.status(403).json({ message: "Access denied to this room's messages" });

    res.status(200).json(room.messages || []);
  } catch (err) {
    console.error("❌ Errore nel recupero dei messaggi:", err);
    res.status(500).json({ message: "Errore nel recupero dei messaggi" });
  }
});

// ✅ POST: nuovo messaggio nella stanza se utente è membro
app.post("/api/v1/rooms/:id/messages", async (req, res) => {
  const roomId = req.params.id;
  const dbMessage = req.body;
  const userUid = dbMessage.uid;

  if (!userUid) {
    return res.status(401).json({ error: "Missing user UID in message" });
  }

  dbMessage.timestamp = new Date(dbMessage.timestamp);

  try {
    const room = await Rooms.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });
    if (!room.members.includes(userUid)) return res.status(403).json({ message: "Access denied to this room" });

    room.messages.push(dbMessage);
    room.lastMessageTimestamp = dbMessage.timestamp;
    await room.save();

    PusherClient.trigger(`room_${roomId}`, "inserted", {
      roomId: roomId,
      message: dbMessage,
    });

    res.status(201).json(dbMessage);
  } catch (err) {
    console.error("❌ Errore POST /rooms/:id/messages:", err);
    res.status(500).json({ message: "Errore nel salvataggio del messaggio" });
  }
});

// Serve React build in produzione
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../bepoliby-fe/build")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../bepoliby-fe/build", "index.html"));
  });
}

// Gestione errori globali
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err);
});

// Avvio server
const server = app.listen(port, () => {
  console.log(`🚀 Server in ascolto sulla porta ${port}`);
});

server.keepAliveTimeout = 120000;
server.headersTimeout = 121000;



