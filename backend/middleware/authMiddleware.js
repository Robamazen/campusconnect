const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');

            if(!req.user){
                const error = new Error('User no longer exists');
                error.statusCode = 401;
                return next(error);
            }

            return next();
        } catch (err){
            err.statusCode = 401;
            err.message = 'Not authorized, invalid or expired token';
            return next(err);
        }
    }

    if(!token){
        const error = new Error('Not authorized, no token provided');
        error.statusCode = 401;
        return next(error);
    }
};

module.exports = {protect};