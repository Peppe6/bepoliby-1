const express = require('express');
const mongoose = require('mongoose');
const Rooms = require('./model/dbRooms');
const Pusher = require('pusher');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const app = express();
const port = process.env.PORT || 9000;

// Content Security Policy configurata correttamente
app.use(
  helmet.contentSecurityPolicy({
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "https://translate.google.com",
        "https://www.gstatic.com",
        "'unsafe-inline'"
      ],
      styleSrc: [
        "'self'",
        "https://fonts.googleapis.com",
        "https://translate.googleapis.com",
        "https://www.gstatic.com",
        "'unsafe-inline'"
      ],
      styleSrcElem: [
        "'self'",
        "https://fonts.googleapis.com",
        "https://translate.googleapis.com",
        "https://www.gstatic.com",
        "'unsafe-inline'"
      ],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: [
        "'self'",
        "data:",
        "https://www.gstatic.com",
        "https://avatars.dicebear.com",
        "https://www.gravatar.com",
        "https://render-prod-avatars.s3.us-west-2.amazonaws.com"
      ],
      connectSrc: ["'self'", "wss:", "https:"],
    }
  })
);

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
app.get('/', (req, res) => {
  res.status(200).send('✅ API Bepoliby attiva sulla root');
});

app.get('/api', (req, res) => {
  res.status(200).send("Benvenuto sul Server");
});

// GET tutte le stanze ordinate per ultimo messaggio
app.get("/api/v1/rooms", async (req, res) => {
  try {
    const data = await Rooms.find().sort({ lastMessageTimestamp: -1 });
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

// POST nuovo messaggio in una stanza e aggiorna lastMessageTimestamp
app.post("/api/v1/rooms/:id/messages", async (req, res) => {
  const roomId = req.params.id;
  const dbMessage = req.body;

  dbMessage.timestamp = new Date(dbMessage.timestamp);

  try {
    const room = await Rooms.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    room.messages.push(dbMessage);
    room.lastMessageTimestamp = dbMessage.timestamp;
    await room.save();

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

// Serve il frontend React in produzione
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../bepoliby-fe/build')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../bepoliby-fe/build', 'index.html'));
  });
}

// Error handling globale
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



