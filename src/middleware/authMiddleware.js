const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const User = require('../models/UserModel');

const getToken = (req) => {
    const authorization = req.headers.authorization || req.headers.token;
    if (!authorization) return null;
    return authorization.startsWith('Bearer ') ? authorization.split(' ')[1] : authorization;
};

const verifyToken = async (req, res, next, options = {}) => {
    const token = getToken(req);
    if (!token) {
        return res.status(401).json({
            status: 'ERR',
            code: 'TOKEN_MISSING',
            message: 'Token không được cung cấp',
        });
    }

    try {
        const decoded = jwt.verify(token, env.accessTokenSecret);
        const account = await User.findById(decoded?.id).select('status isAdmin isDeleted').lean();
        if (!account || account.status === 'blocked' || account.isDeleted) {
            return res.status(403).json({
                status: 'ERR',
                code: 'ACCOUNT_FORBIDDEN',
                message: 'Tài khoản không được phép truy cập',
            });
        }

        req.user = decoded;
        req.userId = decoded?.id;
        req.isAdmin = Boolean(account?.isAdmin);

        if (options.adminOnly && !req.isAdmin) {
            return res.status(403).json({
                status: 'ERR',
                code: 'ADMIN_ONLY',
                message: 'Chỉ admin mới có quyền truy cập',
            });
        }

        if (options.sameUserOrAdmin) {
            const userId = req.params.id;
            if (userId && !req.isAdmin && req.userId !== userId) {
                return res.status(403).json({
                    status: 'ERR',
                    code: 'FORBIDDEN_RESOURCE',
                    message: 'Bạn không có quyền truy cập tài nguyên này',
                });
            }
        }

        return next();
    } catch (err) {
        return res.status(401).json({
            status: 'ERR',
            code: 'TOKEN_INVALID',
            message: 'Xác thực thất bại',
        });
    }
};

const attachUserIfValidToken = (req, res, next) => {
    const token = getToken(req);
    if (!token) return next();

    try {
        const user = jwt.verify(token, env.accessTokenSecret);
        User.findById(user?.id)
            .select('status isAdmin isDeleted')
            .lean()
            .then((account) => {
                if (account && account.status !== 'blocked' && !account.isDeleted) {
                    req.user = user;
                    req.userId = user?.id;
                    req.isAdmin = Boolean(account?.isAdmin);
                }
                return next();
            })
            .catch(() => next());
    } catch (err) {
        return next();
    }
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
    attachUserIfValidToken,
};
