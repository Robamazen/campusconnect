const authorize = (...roles) => {
    return (req, res, next) => {
        if(!req.user) {
            const error = new Error('Not authorized');
            error.statusCode = 401;
            return next(error);
        }

        if(!roles.includes(req.user.role)){
            const error = new Error(`Role ${req.user.role} is not permitted to perform this action`);
            error.statusCode = 403;
            return next(error);
        }

        next();
    }
};

const requireApprovedClubLeader = (req, res, next) => {
    if(req.user.role != 'clubLeader'){
        const error = new Error('Only club leaders can perform this action');
        error.statusCode = 403;
        return next(error);
    }

    if(req.user.status != 'approved'){
        const error = new Error('Your club leader account is not yet approved');
        error.statusCode = 403;
        return next(error);
    }
    next();
};

module.exports = {requireApprovedClubLeader, authorize};