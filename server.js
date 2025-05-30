const express = require('express');
const mongoose = require('mongoose');
const Rooms = require('./model/dbRooms');
const Pusher = require('pusher');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 9000;

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB connection
const connectionDbUrl = "mongodb+srv://drankenstain:RzdXh55Ie1KzQ2wo@cluster0.rcldbiz.mongodb.net/bepoliby?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(connectionDbUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log("✅ MongoDB connected successfully");
}).catch((err) => {
  console.error("❌ MongoDB connection error:", err);
});

const db = mongoose.connection;
db.once("open", () => {
  console.log("🟢 Database connesso");

  const roomCollection = db.collection("rooms");
  const changeStream = roomCollection.watch();

  changeStream.on("change", (change) => {
    if (change.operationType === "update") {
      const updatedFields = change.updateDescription.updatedFields;
      if (updatedFields && Object.keys(updatedFields).some(key => key.startsWith("messages"))) {
        console.log("🔔 Nuovo messaggio rilevato");

        // Trigger evento Pusher generico
        PusherClient.trigger("messages", "inserted", {
          message: "Nuovo messaggio in una stanza"
        });
      }
    }
  });

  changeStream.on("error", (err) => {
    console.error("❌ Errore ChangeStream:", err);
  });
});

// Pusher config
const PusherClient = new Pusher({
  appId: "1999725",
  key: "6a10fce7f61c4c88633b",
  secret: "cb00372865ac43a1e9e8",
  cluster: "eu",
  useTLS: true,
});

// Rotte API
app.get('/api', (req, res) => {
  res.status(200).send("Benvenuto sul Server");
});

// GET tutte le stanze
app.get("/api/v1/rooms", async (req, res) => {
  try {
    const data = await Rooms.find();
    res.status(200).send(data);
  } catch (err) {
    res.status(500).send(err);
  }
});

// POST nuova stanza
app.post("/api/v1/rooms", async (req, res) => {
  try {
    console.log("📥 Richiesta creazione stanza:", req.body);
    const data = await Rooms.create(req.body);
    res.status(201).send(data);
  } catch (err) {
    console.error("❌ Errore creazione stanza:", err);
    res.status(500).send(err);
  }
});

// GET stanza per ID
app.get("/api/v1/rooms/:id", async (req, res) => {
  try {
    const room = await Rooms.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }
    res.status(200).json(room);
  } catch (err) {
    console.error("❌ Errore durante il recupero della stanza:", err);
    res.status(500).json({ message: "Errore nel recupero della stanza" });
  }
});

// GET messaggi di una stanza
app.get("/api/v1/rooms/:id/messages", async (req, res) => {
  try {
    const room = await Rooms.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }
    res.status(200).json(room.messages || []);
  } catch (err) {
    console.error("❌ Errore nel recupero dei messaggi:", err);
    res.status(500).json({ message: "Errore nel recupero dei messaggi" });
  }
});

// POST nuovo messaggio in una stanza
app.post("/api/v1/rooms/:id/messages", async (req, res) => {
  const roomId = req.params.id;
  const dbMessage = req.body;

  try {
    const room = await Rooms.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    room.messages.push(dbMessage);
    await room.save();

    // Notifica Pusher (facoltativa)
    PusherClient.trigger("messages", "inserted", {
      roomId: roomId,
      message: dbMessage
    });

    res.status(201).json(dbMessage);
  } catch (err) {
    console.error("❌ Errore POST /rooms/:id/messages:", err);
    res.status(500).json({ message: "Errore nel salvataggio del messaggio" });
  }
});

// Error handling globale (evita crash)
process.on("uncaughtException", (err) => {
  console.error("❗ Uncaught Exception:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("❗ Unhandled Rejection:", err);
});

// Avvio server
app.listen(port, () => {
  console.log(`🚀 Server in ascolto su http://localhost:${port}`);
});

