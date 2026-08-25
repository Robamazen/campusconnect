const express = require('express');
const router = require('router');

const {login, register, getMe} = require('../controllers/authController');
const {protect} = require('../routes/authRoutes');

router.get('/login', login);
router.get('/register', register);
router.get('/me', protect, getMe);

module.exports = router;