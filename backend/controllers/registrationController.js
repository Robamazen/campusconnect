const Registration = require('../models/Registration');
const Event = require('../models/Event');

// @route POST /api/registrations
// @access Student
const createRegistration = async (req, res, next) => {
  try {
    const { eventId, note } = req.body;

    if (!eventId) {
      const error = new Error('eventId is required');
      error.statusCode = 400;
      return next(error);
    }

    const event = await Event.findById(eventId);
    if (!event) {
      const error = new Error('Event not found');
      error.statusCode = 404;
      return next(error);
    }

    if (event.status === 'closed') {
      const error = new Error('This event is closed for registration');
      error.statusCode = 400;
      return next(error);
    }

    if (new Date(event.eventDate) < new Date()) {
      const error = new Error('Cannot register for an event that has already passed');
      error.statusCode = 400;
      return next(error);
    }

    // Rule: reject if slots are full — atomically reserve a slot first.
    // findOneAndUpdate with a $expr filter + $inc is a single atomic DB operation,
    // so two simultaneous requests for the last slot can't both pass this check.
    // (A count-then-create approach has a race condition here — two requests
    // can both read "under capacity" before either one writes.)
    let reserved = false;
    if (event.totalSlots !== undefined && event.totalSlots !== null) {
      const updatedEvent = await Event.findOneAndUpdate(
        { _id: eventId, $expr: { $lt: ['$filledSlots', '$totalSlots'] } },
        { $inc: { filledSlots: 1 } },
        { new: true }
      );

      if (!updatedEvent) {
        const error = new Error('This event has reached its capacity');
        error.statusCode = 400;
        return next(error);
      }
      reserved = true;
    }

    // Rule: no duplicate registration — friendlier pre-check; the schema's
    // unique index on {user, event} is the actual source of truth
    const existing = await Registration.findOne({ user: req.user._id, event: eventId });
    if (existing) {
      if (reserved) {
        await Event.findByIdAndUpdate(eventId, { $inc: { filledSlots: -1 } });
      }
      const error = new Error('You have already registered for this event');
      error.statusCode = 400;
      return next(error);
    }

    try {
      const registration = await Registration.create({
        user: req.user._id,
        event: eventId,
        note
      });
      return res.status(201).json({ success: true, registration });
    } catch (err) {
      // Registration failed after we reserved a slot (e.g. duplicate-key error
      // from the {user, event} unique index if two requests raced past the
      // findOne check above) — release the slot we took.
      if (reserved) {
        await Event.findByIdAndUpdate(eventId, { $inc: { filledSlots: -1 } });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
};

// @route GET /api/registrations/my
// @access Student
const getMyRegistrations = async (req, res, next) => {
  try {
    const registrations = await Registration.find({ user: req.user._id })
      .populate('event', 'title club location eventDate status category totalSlots filledSlots')
      .sort({ registeredAt: -1 });

    res.status(200).json({ success: true, count: registrations.length, registrations });
  } catch (err) {
    next(err);
  }
};

// @route GET /api/registrations/event/:id
// @access Owner (club leader who created the event) / Admin
const getEventRegistrants = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      const error = new Error('Event not found');
      error.statusCode = 404;
      return next(error);
    }

    const isOwner = event.createdBy.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') {
      const error = new Error('You do not have permission to view registrants for this event');
      error.statusCode = 403;
      return next(error);
    }

    const registrants = await Registration.find({ event: req.params.id })
      .populate('user', 'name email')
      .sort({ registeredAt: 1 });

    res.status(200).json({ success: true, count: registrants.length, registrants });
  } catch (err) {
    next(err);
  }
};

// @route PUT /api/registrations/:id
// @access Owner (of the related event) / Admin
const updateRegistrationStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
      const error = new Error('Status must be pending, confirmed, or cancelled');
      error.statusCode = 400;
      return next(error);
    }

    const registration = await Registration.findById(req.params.id).populate('event');
    if (!registration) {
      const error = new Error('Registration not found');
      error.statusCode = 404;
      return next(error);
    }

    const isOwner = registration.event.createdBy.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') {
      const error = new Error('You do not have permission to update this registration');
      error.statusCode = 403;
      return next(error);
    }

    const wasActive = registration.status !== 'cancelled';
    const willBeActive = status !== 'cancelled';

    // Leader is cancelling an active registration — free the slot
    if (wasActive && !willBeActive) {
      await Event.findByIdAndUpdate(registration.event._id, { $inc: { filledSlots: -1 } });
    }

    // Leader is reinstating a previously cancelled registration — re-check
    // capacity atomically before allowing it, same logic as createRegistration
    if (!wasActive && willBeActive) {
      const totalSlots = registration.event.totalSlots;
      if (totalSlots !== undefined && totalSlots !== null) {
        const updatedEvent = await Event.findOneAndUpdate(
          { _id: registration.event._id, $expr: { $lt: ['$filledSlots', '$totalSlots'] } },
          { $inc: { filledSlots: 1 } },
          { new: true }
        );
        if (!updatedEvent) {
          const error = new Error('Cannot reinstate — this event has reached its capacity');
          error.statusCode = 400;
          return next(error);
        }
      }
    }

    registration.status = status;
    await registration.save();

    res.status(200).json({ success: true, registration });
  } catch (err) {
    next(err);
  }
};

// @route DELETE /api/registrations/:id
// @access Student (own) / Admin
const cancelRegistration = async (req, res, next) => {
  try {
    const registration = await Registration.findById(req.params.id);
    if (!registration) {
      const error = new Error('Registration not found');
      error.statusCode = 404;
      return next(error);
    }

    const isOwner = registration.user.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') {
      const error = new Error('You do not have permission to cancel this registration');
      error.statusCode = 403;
      return next(error);
    }

    const wasActive = registration.status !== 'cancelled';
    await registration.deleteOne();

    if (wasActive) {
      await Event.findByIdAndUpdate(registration.event, { $inc: { filledSlots: -1 } });
    }

    res.status(200).json({ success: true, message: 'Registration cancelled' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createRegistration,
  getMyRegistrations,
  getEventRegistrants,
  updateRegistrationStatus,
  cancelRegistration
};