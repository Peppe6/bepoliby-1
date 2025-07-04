const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  bio: { type: String }, // opzionale
  avatar: { type: String }, // opzionale: URL o path immagine
}, {
  timestamps: true
});

// Aggiungi un indice per ottimizzare la ricerca per username
userSchema.index({ username: 'text' });

module.exports = mongoose.model('User', userSchema);
