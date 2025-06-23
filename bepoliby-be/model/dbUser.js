const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  // eventualmente password, avatar, ecc.
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
