const User = require('../models/User');

// @route GET /api/users/profile
// @access Private
const getProfile = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, user: req.user });
  } catch (err) {
    next(err);
  }
};

// @route PUT /api/users/profile
// @access Private
const updateProfile = async (req, res, next) => {
  try {
    const { name, bio, profilePicture } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (bio !== undefined) updates.bio = bio;
    if (profilePicture !== undefined) updates.profilePicture = profilePicture;

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true
    }).select('-password');

    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

// @route GET /api/users
// @access Admin
// Supports ?role=clubLeader and/or ?status=pending filtering
const getAllUsers = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.status) filter.status = req.query.status;

    const users = await User.find(filter).select('-password');
    res.status(200).json({ success: true, count: users.length, users });
  } catch (err) {
    next(err);
  }
};

// @route PUT /api/users/:id/status
// @access Admin
// Approve or reject a pending club leader
const updateUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      const error = new Error('Status must be pending, approved, or rejected');
      error.statusCode = 400;
      return next(error);
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      return next(error);
    }

    if (user.role !== 'clubLeader') {
      const error = new Error('Status only applies to club leader accounts');
      error.statusCode = 400;
      return next(error);
    }

    user.status = status;
    await user.save();

    res.status(200).json({ success: true, user: { id: user._id, name: user.name, status: user.status } });
  } catch (err) {
    next(err);
  }
};

// @route PUT /api/users/:id/role
// @access Admin
const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;

    if (!['student', 'clubLeader', 'admin'].includes(role)) {
      const error = new Error('Role must be student, clubLeader, or admin');
      error.statusCode = 400;
      return next(error);
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      return next(error);
    }

    user.role = role;
    if (role === 'clubLeader' && !user.status) {
      user.status = 'pending';
    }
    await user.save();

    res.status(200).json({ success: true, user: { id: user._id, name: user.name, role: user.role, status: user.status } });
  } catch (err) {
    next(err);
  }
};

module.exports = { getProfile, updateProfile, getAllUsers, updateUserStatus, updateUserRole };