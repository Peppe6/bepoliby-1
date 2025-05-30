 const mongoose = require('mongoose');

const bepolibySchema = new mongoose.Schema({
  message: String,
  name: String,
  timestamp: String,

  uid:String
});

// forza il nome della collezione a "messagecontents"
module.exports = mongoose.model('Message', bepolibySchema, 'messagecontents');
