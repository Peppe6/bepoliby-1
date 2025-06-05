const mongoose = require('mongoose');

const messageSchema = {
  message: String,
  name: String,
  timestamp: Date, // cambia da String a Date per comodità
  uid: String
};

const roomSchema = mongoose.Schema({
  name: { type: String, required: true },
  messages: [messageSchema],
  lastMessageTimestamp: { type: Date, default: null }  // <-- aggiungi questo campo
});

module.exports = mongoose.model('Rooms', roomSchema);

