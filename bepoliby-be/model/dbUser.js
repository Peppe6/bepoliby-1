
const mongoose = require('mongoose');

const utenteSchema = new mongoose.Schema({
  nome: String,
  username: { type: String, unique: true },
  password: String,
  bio: String,
  profilePic: {
    data: Buffer,
    contentType: String
  },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Utente" }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: "Utente" }],
  utentiRecenti: [{ type: mongoose.Schema.Types.ObjectId, ref: "Utente" }]
});

module.exports = mongoose.model("Utente", utenteSchema, "utenti"); 
// Attenzione: usa la terza stringa per indicare la collection MongoDB "utenti" (verifica il nome esatto della collection nel db)
