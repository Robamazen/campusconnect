const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  getAllUsers,
  updateUserStatus,
  updateUserRole
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);

router.get('/', protect, authorize('admin'), getAllUsers);
router.put('/:id/status', protect, authorize('admin'), updateUserStatus);
router.put('/:id/role', protect, authorize('admin'), updateUserRole);

module.exports = router;