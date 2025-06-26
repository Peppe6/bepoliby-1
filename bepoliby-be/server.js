require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const helmet = require('helmet');
const Pusher = require('pusher');
const path = require('path');
const Rooms = require('./model/dbRooms');
const User = require('./model/dbUser');

const app = express();
const port = process.env.PORT || 9000;
const isProduction = process.env.NODE_ENV === 'production';

// ✅ CORS origins consentiti
const allowedOrigins = [
  "https://bepoli.onrender.com",
  "https://bepoliby-1-2.onrender.com",
  "https://bepoliby-1.onrender.com",
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

app.use(cors(corsOptions));
app.use(helmet());
app.use(express.json());

// ✅ Cookie di sessione con gestione ambiente
app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecretkey',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  cookie: {
    httpOnly: true,
    secure: isProduction,                      // true in produzione (HTTPS)
    sameSite: isProduction ? 'none' : 'lax',   // 'none' in prod per cross-origin
    maxAge: 7 * 24 * 60 * 60 * 1000            // 7 giorni
  }
}));

// ✅ CSP opzionale
app.use(helmet.contentSecurityPolicy({
  useDefaults: true,
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "https://translate.google.com", "https://www.gstatic.com", "https://apis.google.com"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    imgSrc: ["'self'", "data:", "https://avatars.dicebear.com", "https://www.gravatar.com", "https://render-prod-avatars.s3.us-west-2.amazonaws.com"],
    connectSrc: ["'self'", "https:", "wss:", "http://localhost:9000", "http://localhost:3000", "wss://ws-eu.pusher.com"]
  }
}));

// ✅ Middleware sessione
function authenticateSession(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: "Utente non autenticato. Effettua il login." });
  }

  req.user = {
    uid: req.session.user.id,
    nome: req.session.user.nome,
    username: req.session.user.username
  };
  next();
}

// ✅ Endpoint per ricevere dati da postMessage
app.post('/api/ricevi-dati', (req, res) => {
  const { id, username, nome } = req.body;
  if (!id || !username || !nome) {
    return res.status(400).json({ message: "Dati utente mancanti" });
  }

  req.session.user = { id, username, nome };
  res.status(200).json({ message: "Sessione impostata correttamente" });
});

// ✅ Verifica sessione utente
app.get('/api/session/user', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Utente non autenticato" });
  }
  res.status(200).json({ user: req.session.user });
});

// ✅ MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("✅ MongoDB connesso"))
  .catch(err => console.error("❌ Errore connessione MongoDB:", err));

// ✅ Pusher
const PusherClient = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: "eu",
  useTLS: true,
});

// ✅ Change Stream MongoDB
const db = mongoose.connection;
db.once("open", () => {
  const roomCollection = db.collection("rooms");
  const changeStream = roomCollection.watch();

  changeStream.on("change", async (change) => {
    if (change.operationType === "update") {
      const updatedFields = change.updateDescription.updatedFields;
      if (Object.keys(updatedFields).some(k => k.startsWith("messages"))) {
        const roomId = change.documentKey._id.toString();
        const room = await Rooms.findById(roomId);
        const lastMessage = room.messages.at(-1);
        if (lastMessage) {
          PusherClient.trigger(`room_${roomId}`, "inserted", { roomId, message: lastMessage });
        }
      }
    }
  });
});

// ✅ Endpoint test
app.get("/", (req, res) => res.send("🌐 Server attivo messaggistica"));
app.get("/api", (req, res) => res.send("🎉 API attiva"));

// ✅ API MESSAGGISTICA
app.get("/api/v1/users", authenticateSession, async (req, res) => {
  try {
    const users = await User.find({ id: { $ne: req.user.uid } }, { id: 1, nome: 1, username: 1, _id: 0 });
    res.status(200).json(users);
  } catch {
    res.status(500).json({ error: "Errore nel recupero utenti" });
  }
});

app.get("/api/v1/rooms", authenticateSession, async (req, res) => {
  try {
    const data = await Rooms.find({ members: req.user.uid }).sort({ lastMessageTimestamp: -1 });
    res.status(200).send(data);
  } catch {
    res.status(500).json({ error: "Errore nel recupero stanze" });
  }
});

app.post("/api/v1/rooms", authenticateSession, async (req, res) => {
  try {
    const { name, members = [] } = req.body;
    if (!name || members.length < 2) {
      return res.status(400).json({ error: "Dati stanza mancanti o insufficienti" });
    }

    const existingRoom = await Rooms.findOne({
      members: { $all: members, $size: members.length }
    });

    if (existingRoom) {
      return res.status(409).json({ error: "Stanza già esistente", roomId: existingRoom._id });
    }

    const newRoom = await Rooms.create({ name, members, messages: [], lastMessageTimestamp: null });
    res.status(201).json(newRoom);
  } catch {
    res.status(500).json({ error: "Errore nella creazione stanza" });
  }
});

app.get("/api/v1/rooms/:id/messages", authenticateSession, async (req, res) => {
  try {
    const room = await Rooms.findById(req.params.id);
    if (!room) return res.status(404).json({ message: "Stanza non trovata" });
    if (!room.members.includes(req.user.uid)) return res.status(403).json({ message: "Accesso negato" });

    res.status(200).json(room.messages || []);
  } catch {
    res.status(500).json({ error: "Errore nel recupero messaggi" });
  }
});

app.post("/api/v1/rooms/:id/messages", authenticateSession, async (req, res) => {
  try {
    const room = await Rooms.findById(req.params.id);
    if (!room) return res.status(404).json({ message: "Stanza non trovata" });
    if (!room.members.includes(req.user.uid)) return res.status(403).json({ message: "Accesso negato" });

    const newMessage = {
      message: req.body.message,
      name: req.user.nome,
      timestamp: new Date().toISOString(),
      uid: req.user.uid
    };

    room.messages.push(newMessage);
    room.lastMessageTimestamp = new Date();
    await room.save();

    res.status(201).json(newMessage);
  } catch {
    res.status(500).json({ error: "Errore nell'invio messaggio" });
  }
});

// ✅ Avvio server
app.listen(port, () => console.log(`🚀 Server avviato sulla porta ${port}`));
