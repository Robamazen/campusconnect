const express = require('express');
const router = express.Router();
const {
  createEvent,
  getEvents,
  getEventById,
  getMyEvents,
  updateEvent,
  deleteEvent
} = require('../controllers/eventController');
const { protect } = require('../middleware/authMiddleware');
const { requireApprovedClubLeader } = require('../middleware/roleMiddleware');

// Public
router.get('/', getEvents);

// Specific routes before /:id so "my" isn't parsed as an event id
router.get('/my/created', protect, getMyEvents);

router.get('/:id', getEventById);

// Club Leader (approved) only
router.post('/', protect, requireApprovedClubLeader, createEvent);

// roleMiddleware only knows about role, not who created the resource
router.put('/:id', protect, updateEvent);
router.delete('/:id', protect, deleteEvent);

module.exports = router;