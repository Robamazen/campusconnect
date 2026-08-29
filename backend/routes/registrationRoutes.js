const express = require('express');
const router = express.Router();
const {
  createRegistration,
  getMyRegistrations,
  getEventRegistrants,
  updateRegistrationStatus,
  cancelRegistration
} = require('../controllers/registrationController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');


// All registration routes require login
router.post('/', protect, authorize('student'), createRegistration);
router.get('/my', protect, getMyRegistrations);
router.get('/event/:id', protect, getEventRegistrants); // ownership checked in controller
router.put('/:id', protect, updateRegistrationStatus);   // ownership checked in controller
router.delete('/:id', protect, cancelRegistration);       // ownership checked in controller

module.exports = router;