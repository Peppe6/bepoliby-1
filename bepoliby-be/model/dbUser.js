const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },  // UID unico
  nome: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  // password, avatar, ecc.
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
