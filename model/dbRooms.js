const mongoose = require('mongoose');

const messageSchema = {
  message: String,
  name: String,
  timestamp: String,
  uid: String
};

const roomSchema = mongoose.Schema({
  name: { type: String, required: true },
  messages: [messageSchema] // ← array di messaggi
});

module.exports = mongoose.model('Rooms', roomSchema);
