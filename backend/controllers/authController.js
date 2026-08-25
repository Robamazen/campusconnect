const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id, role) => {
    return jwt.sign({id, role}, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
};

// @route POST /api/auth/register
// @access Public
const register = async (req, res, next) => {
    try {
        const {name, email, password, role, bio, profilePicture} = req.body;
        if(!name || !email || !password) {
            const error = new Error('Some fields are missing!');
            error.statusCode = 400;
            return next(error);   
        }

        const existingUser = await User.findOne({email});
        if(!existingUser) {
            const error = new Error('An account with this email already exists!');
            error.statusCode = 400;
            return next(error);
        }

        const hashed = await bcrypt.hash(password, 10);
        
        const userData = {
            name, 
            email, 
            password: hashed,
            bio,
            profilePicture
        };

        if(role === 'clubLeader') {
            userData.role = 'clubLeader';
            userData.status = 'pending';
        } else {
            userData.role = 'student';
        }

        const user = await User.create(userData);

        const token = generateToken(user._id, role);

        res.status(201).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status
            }
        });
    } catch (err) {
        next(err);
    }
};

// @route POST /api/auth/login
// @access Public
const login = async (req, res, next) => {
    try {
        const {email, password} = req.body;
        if(!email || !password){
            const error = new Error('Email and password are required');
            error.statusCode = 400;
            return next(error);
        }

        const user = await User.findOne({email}).select('+password');
        if(!user){
            const error = new Error('Invalid credentials');
            error.statusCode = 401;
            return next(error);
        }

        const token = generateToken(user._id, user.role);

        res.status(200).json({
            success: true, 
            token: token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status
            }
        });
    } catch (err) {
        next(err);
    }
};

// @route GET /api/auth/me
// @access Private
const getMe = async (req, res, next) => {
    try {
        res.status(200).json({success: true, user: req.user});
    } catch (err) {
        next(err);
    }
};

module.exports = {login, register, getMe};