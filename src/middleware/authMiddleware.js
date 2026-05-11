const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

const getToken = (req) => {
    const authorization = req.headers.authorization || req.headers.token;
    if (!authorization) return null;
    return authorization.startsWith('Bearer ') ? authorization.split(' ')[1] : authorization;
};

const verifyToken = (req, res, next, options = {}) => {
    const token = getToken(req);
    if (!token) {
        return res.status(401).json({
            status: 'ERR',
            message: 'Token không được cung cấp',
        });
    }

    jwt.verify(token, process.env.ACCESS_TOKEN, (err, user) => {
        if (err) {
            return res.status(401).json({
                status: 'ERR',
                message: 'Xác thực thất bại',
            });
        }

        req.user = user;
        req.userId = user?.id;
        req.isAdmin = Boolean(user?.isAdmin);

        if (options.adminOnly && !req.isAdmin) {
            return res.status(403).json({
                status: 'ERR',
                message: 'Chỉ admin mới có quyền truy cập',
            });
        }

        if (options.sameUserOrAdmin) {
            const userId = req.params.id;
            if (userId && !req.isAdmin && req.userId !== userId) {
                return res.status(403).json({
                    status: 'ERR',
                    message: 'Bạn không có quyền truy cập tài nguyên này',
                });
            }
        }

        return next();
    });
};

const authMiddleware = (req, res, next) => {
    return verifyToken(req, res, next, { adminOnly: true });
};

const authUserMiddleware = (req, res, next) => {
    return verifyToken(req, res, next, { sameUserOrAdmin: true });
};

module.exports = {
    authMiddleware,
    authUserMiddleware,
    verifyToken,
};
