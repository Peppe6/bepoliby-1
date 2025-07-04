
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  message: String,
  name: String,
  timestamp: Date,
  uid: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const roomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  messages: {
    type: [messageSchema],
    default: []
  },
  lastMessageTimestamp: {
    type: Date,
    default: null
  },
  members: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    required: true
  }
});

module.exports = mongoose.model('Room', roomSchema);


