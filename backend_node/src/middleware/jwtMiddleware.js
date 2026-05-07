import jwt from 'jsonwebtoken';
require('dotenv').config();

const nonSecurePaths = ['/api/login', '/api/register'];

const createToken = (payload) => {
    let key = process.env.JWT_SECRET;
    let token = null;
    try {
        token = jwt.sign(payload, key, { expiresIn: process.env.JWT_EXPIRES_IN });
    } catch (err) {
        console.log(err);
    }
    return token;
};

const verifyToken = (token) => {
    let key = process.env.JWT_SECRET;
    let decoded = null;
    try {
        decoded = jwt.verify(token, key);
    } catch (err) {
        console.log(err);
    }
    return decoded;
};

const checkUserJWT = (req, res, next) => {
    if (nonSecurePaths.includes(req.path)) return next();

    let cookies = req.cookies;
    let tokenFromHeader = req.headers.authorization;

    if (tokenFromHeader && tokenFromHeader.startsWith('Bearer ')) {
        let token = tokenFromHeader.split(' ')[1];
        let decoded = verifyToken(token);
        if (decoded) {
            req.user = decoded;
            return next();
        }
    }

    return res.status(401).json({
        EC: -1,
        DT: '',
        EM: 'Not authenticated user'
    });
};

const checkUserPermission = (req, res, next) => {
    if (nonSecurePaths.includes(req.path)) return next();

    if (req.user) {
        let role = req.user.role;
        // Logic for role-based access can be added here
        // For now, any authenticated user can proceed
        return next();
    } else {
        return res.status(403).json({
            EC: -1,
            DT: '',
            EM: 'You don\'t have permission to access this resource'
        });
    }
};

export {
    createToken,
    verifyToken,
    checkUserJWT,
    checkUserPermission
};
