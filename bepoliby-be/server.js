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
const User = require('./model/dbUser');

const app = express();
const port = process.env.PORT || 9000;

// Middleware
app.use(express.json());
app.use(helmet());
app.use(session({
  secret: process.env.SESSION_SECRET || "supersecret",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // true in produzione con HTTPS
}));

// CORS
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

// MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Pusher setup
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

const PusherClient = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: "eu",
  useTLS: true,
});

// TEST
app.get("/", (req, res) => res.send("🌐 API Bepoliby attiva"));

// Ricezione dati da sessione (non usato attualmente)
app.post('/api/ricevi-dati', (req, res) => {
  const { id, username, nome } = req.body;
  if (!id || !username || !nome) {
    return res.status(400).json({ message: "Dati utente mancanti" });
  }
  res.status(200).json({ message: "Dati ricevuti correttamente" });
});

// Generazione token JWT
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

// ============================
//         ROTTE UTENTI
// ============================

// ✅ Ricerca utenti senza token (con paginazione)
app.get("/api/v1/users/search", async (req, res) => {
  const query = req.query.q;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  if (!query) {
    return res.status(400).json({ message: "Query mancante" });
  }

  try {
    const regex = new RegExp(query, 'i');

    const results = await User.find(
      { $or: [{ username: regex }, { nome: regex }] },
      'username nome _id'
    )
      .skip(skip)
      .limit(limit);

    res.json(results.map(u => ({
      id: u._id,
      username: u.username,
      nome: u.nome,
      profilePicUrl: `/api/user-photo/${u._id}`
    })));
  } catch (err) {
    console.error("❌ Errore ricerca utenti:", err);
    res.status(500).json({ message: "Errore ricerca" });
  }
});

// ✅ Lista utenti (senza token)
app.get("/api/v1/users", async (req, res) => {
  try {
    const users = await User.find({}, { _id: 1, nome: 1, username: 1 });
    res.status(200).json(users);
  } catch (err) {
    console.error("Errore nel recupero utenti:", err);
    res.status(500).json({ error: "Errore nel recupero utenti" });
  }
});

// Rotte protette da token
app.get("/api/v1/users/email/:email", verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.email });
    if (!user) return res.status(404).json({ error: "Utente non trovato" });
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: "Errore nel recupero utente" });
  }
});

app.get("/api/v1/users/nome/:nome", verifyToken, async (req, res) => {
  try {
    const nomeRegex = new RegExp(`^${req.params.nome}$`, "i");
    const user = await User.findOne({ nome: nomeRegex });
    if (!user) return res.status(404).json({ error: "Utente non trovato" });
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: "Errore nel recupero utente" });
  }
});

// ============================
//         ROTTE STANZE
// ============================

app.get("/api/v1/rooms", verifyToken, async (req, res) => {
  try {
    const data = await Rooms.find({ members: req.user.uid }).sort({ lastMessageTimestamp: -1 });
    res.status(200).send(data);
  } catch (err) {
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

// Debug: Mostra tutti gli utenti
app.get("/api/debug/users", async (req, res) => {
  try {
    const utenti = await User.find({}, "_id username nome");
    console.log("🧠 Utenti nel DB:", utenti);
    res.json(utenti);
  } catch (err) {
    console.error("❌ Errore nel debug utenti:", err);
    res.status(500).json({ error: "Errore nel recupero utenti" });
  }
});

// Avvio server
app.listen(port, () => console.log(`🚀 Server avviato sulla porta ${port}`));



