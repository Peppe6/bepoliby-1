const mongoose = require('mongoose');

// Schema per il messaggio
const messageSchema = new mongoose.Schema({
  message: { type: String, required: true },
  name: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  uid: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

// Indice per migliorare la ricerca
messageSchema.index({ timestamp: -1 });

// Schema per la stanza di chat
const roomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  messages: {
    type: [messageSchema],
    default: []
  },
  lastMessageTimestamp: { type: Date, default: null },
  members: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    required: true
  }
});

// Indici per migliorare le ricerche
roomSchema.index({ members: 1 }); // Indice sui membri della stanza
roomSchema.index({ lastMessageTimestamp: -1 }); // Indice sul timestamp dell'ultimo messaggio

// Metodo per aggiungere un messaggio a una stanza e aggiornare l'ultimo timestamp
roomSchema.methods.addMessage = async function (message) {
  this.messages.push(message);
  this.lastMessageTimestamp = message.timestamp;
  await this.save();
  return this;
};

// Metodo per ottenere gli utenti in una stanza
roomSchema.methods.getMembers = function () {
  return this.members;
};

module.exports = mongoose.model('Room', roomSchema);


