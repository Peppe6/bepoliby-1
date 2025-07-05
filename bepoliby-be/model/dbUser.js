const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  nome: String,
  username: { type: String, unique: true },
  password: String,
  bio: String,
  profilePic: {
    data: Buffer,
    contentType: String
  },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  utentiRecenti: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
});

// ✅ Aggiungi indice per la ricerca testuale
userSchema.index({ username: 'text', nome: 'text' });

module.exports = mongoose.model("User", userSchema);
