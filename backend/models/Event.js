const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  club: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  requirements: {
    type: [String],
    default: []
  },
  location: {
    type: String,
    required: true
  },
  eventDate: {
    type: Date,
    required: true
  },
  type: {
    type: String,
    enum: ['workshop', 'social', 'competition', 'volunteering', 'other'],
    required: true
  },
  category: {
    type: String,
    required: true
  },
  totalSlots: {
    type: Number
  },
  status: {
    type: String,
    enum: ['open', 'closed'],
    required: true,
    default: 'open'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  filledSlots: { type: Number, default: 0 }
});

module.exports = mongoose.model('Event', eventSchema);