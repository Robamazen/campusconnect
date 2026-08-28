const Event = require('../models/Event');
const {classifyEventCategories} = require('../services/huggingFaceService');

// @route POST /api/events
// @access Club Leader (approved only)
const createEvent = async (req, res, next) => {
    try {
        const {title, club, description, 
            requirements, location, eventDate, type, totalSlots} = req.body;

        if(!title || !club || !description || !requirements || !location || !eventDate
            || !type || !totalSlots) {
                const error = new Error('title, club, description, requirements, location, event Date, type, and total Slots are required');
                error.statusCode = 400;
                return next(error);
            }

        const category = await classifyEventCategories(description);
        const event = await Event.create({
            title,
            club,
            description,
            requirements: requirements || [],
            location,
            eventDate,
            type,
            category,
            totalSlots,
            status: 'open',
            createdBy: req.user._id
        });

        res.status(201).json({success: true, event});
    } catch(err){
        next(err);
    }
};

// @route GET /api/events
// @access Public
// Supports ?category=Tech&type=workshop&status=open&search=keyword
const getEvents = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.type) filter.type = req.query.type;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) {
      filter.title = { $regex: req.query.search, $options: 'i' };
    }

    const events = await Event.find(filter)
      .populate('createdBy', 'name email')
      .sort({ eventDate: 1 });

    res.status(200).json({ success: true, count: events.length, events });
  } catch (err) {
    next(err);
  }
};

// @route GET /api/events/:id
// @access Public
const getEventById = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id).populate('createdBy', 'name email');

    if (!event) {
      const error = new Error('Event not found');
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({ success: true, event });
  } catch (err) {
    next(err);
  }
};

// @route GET /api/events/my/created
// @access Club Leader
const getMyEvents = async (req, res, next) => {
  try {
    const events = await Event.find({ createdBy: req.user._id }).sort({ eventDate: 1 });
    res.status(200).json({ success: true, count: events.length, events });
  } catch (err) {
    next(err);
  }
};

// @route PUT /api/events/:id
// @access Owner / Admin
const updateEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      const error = new Error('Event not found');
      error.statusCode = 404;
      return next(error);
    }

    // Ownership check: only the creating club leader or an admin can edit
    const isOwner = event.createdBy.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') {
      const error = new Error('You do not have permission to edit this event');
      error.statusCode = 403;
      return next(error);
    }

    const { title, club, description, requirements, location, eventDate, type, totalSlots, status } = req.body;

    if (title !== undefined) event.title = title;
    if (club !== undefined) event.club = club;
    if (location !== undefined) event.location = location;
    if (eventDate !== undefined) event.eventDate = eventDate;
    if (type !== undefined) event.type = type;
    if (requirements !== undefined) event.requirements = requirements;
    if (totalSlots !== undefined) event.totalSlots = totalSlots;
    if (status !== undefined) event.status = status;

    if (description !== undefined && description !== event.description) {
      event.description = description;
      event.category = await classifyEventCategories(description);
    }

    await event.save();

    res.status(200).json({ success: true, event });
  } catch (err) {
    next(err);
  }
};

// @route DELETE /api/events/:id
// @access Owner / Admin
const deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      const error = new Error('Event not found');
      error.statusCode = 404;
      return next(error);
    }

    // Ownership check: only the creating club leader or an admin can delete
    const isOwner = event.createdBy.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') {
      const error = new Error('You do not have permission to delete this event');
      error.statusCode = 403;
      return next(error);
    }

    await event.deleteOne();

    res.status(200).json({ success: true, message: 'Event deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { createEvent, getEvents, getEventById, getMyEvents, updateEvent, deleteEvent };