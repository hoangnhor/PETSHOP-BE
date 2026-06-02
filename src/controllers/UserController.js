const UserServices = require('../services/UserServices');
const { getResponseStatusCode } = require('../utils/httpStatus');
const JwtService = require('../services/JwtServices');
const { env } = require('../config/env');
const jwt = require('jsonwebtoken');

const getRefreshTokenCookieOptions = () => ({
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite,
    path: '/',
    maxAge: env.refreshTokenCookieMaxAgeMs,
});

const createUser = async (req, res) => {
    try {
        const { name, email, password, confirmPassword } = req.body;
        const reg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isCheckEmail = reg.test(email);
        if (!name || !email || !password || !confirmPassword) {
            return res.status(400).json({
                status: 'ERR',
                message: 'Đầu vào bắt buộc',
            });
        }
        if (!isCheckEmail) {
            return res.status(400).json({
                status: 'ERR',
                message: 'Email không hợp lệ',
            });
        }
        if (password !== confirmPassword) {
            return res.status(400).json({
                status: 'ERR',
                message: 'Mật khẩu không khớp',
            });
        }
        const response = await UserServices.createUser(req.body);
        return res.status(getResponseStatusCode(response, 201)).json(response);
    } catch (e) {
        return res.status(500).json({
            status: 'ERR',
            code: 'INTERNAL_ERROR',
            message: 'Lỗi hệ thống',
        });
    }
};

const createUserByAdmin = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const reg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!name || !email || !password) {
            return res.status(400).json({
                status: 'ERR',
                message: 'Đầu vào bắt buộc',
            });
        }
        if (!reg.test(email)) {
            return res.status(400).json({
                status: 'ERR',
                message: 'Email không hợp lệ',
            });
        }
        const response = await UserServices.createUser(req.body, true);
        return res.status(getResponseStatusCode(response, 201)).json(response);
    } catch (e) {
        return res.status(500).json({
            status: 'ERR',
            code: 'INTERNAL_ERROR',
            message: 'Lỗi hệ thống',
        });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const reg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isCheckEmail = reg.test(email);
        if (!email || !password) {
            return res.status(400).json({
                status: 'ERR',
                message: 'Đầu vào bắt buộc',
            });
        }
        if (!isCheckEmail) {
            return res.status(400).json({
                status: 'ERR',
                message: 'Email không hợp lệ',
            });
        }
        const response = await UserServices.loginUser(req.body);
        if (response.status === 'OK') {
            const { refresh_token, ...newResponse } = response;
            res.cookie('refresh_token', refresh_token, getRefreshTokenCookieOptions());
            return res.status(200).json(newResponse);
        }
        return res.status(getResponseStatusCode(response, 200)).json(response);
    } catch (e) {
        return res.status(500).json({
            status: 'ERR',
            code: 'INTERNAL_ERROR',
            message: 'Lỗi hệ thống',
        });
    }
};

const updateUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const data = req.body;
        if (!userId) {
            return res.status(400).json({
                status: 'ERR',
                message: 'User ID bắt buộc',
            });
        }
        const response = await UserServices.updateUser(userId, data, req.isAdmin);
        return res.status(getResponseStatusCode(response, 200)).json(response);
    } catch (e) {
        return res.status(500).json({
            status: 'ERR',
            code: 'INTERNAL_ERROR',
            message: 'Lỗi hệ thống',
        });
    }
};

const deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;
        if (!userId) {
            return res.status(400).json({
                status: 'ERR',
                message: 'User ID bắt buộc',
            });
        }
        const response = await UserServices.deleteUser(userId, req.userId);
        return res.status(getResponseStatusCode(response, 200)).json(response);
    } catch (e) {
        return res.status(500).json({
            status: 'ERR',
            code: 'INTERNAL_ERROR',
            message: 'Lỗi hệ thống',
        });
    }
};

const getAllUser = async (req, res) => {
    try {
        const response = await UserServices.getAllUser(req.query);
        return res.status(getResponseStatusCode(response, 200)).json(response);
    } catch (e) {
        return res.status(500).json({
            status: 'ERR',
            code: 'INTERNAL_ERROR',
            message: 'Lỗi hệ thống',
        });
    }
};

const getDetailsUser = async (req, res) => {
    try {
        const userId = req.params.id;
        if (!userId) {
            return res.status(400).json({
                status: 'ERR',
                message: 'User ID bắt buộc',
            });
        }
        const response = await UserServices.getDetailsUser(userId);
        return res.status(getResponseStatusCode(response, 200)).json(response);
    } catch (e) {
        return res.status(500).json({
            status: 'ERR',
            code: 'INTERNAL_ERROR',
            message: 'Lỗi hệ thống',
        });
    }
};

const refreshToken = async (req, res) => {
    try {
        const token = req.cookies.refresh_token;
        if (!token) {
            return res.status(401).json({
                status: 'ERR',
                code: 'TOKEN_MISSING',
                message: 'Token bắt buộc',
            });
        }
        const response = await JwtService.refreshTokenJwtService(token);
        if (response.status === 'OK' && response.refresh_token) {
            res.cookie('refresh_token', response.refresh_token, getRefreshTokenCookieOptions());
            const { refresh_token, ...safeResponse } = response;
            return res.status(200).json(safeResponse);
        }
        return res.status(response.status === 'OK' ? 200 : 401).json(response);
    } catch (e) {
        return res.status(500).json({
            status: 'ERR',
            code: 'INTERNAL_ERROR',
            message: 'Lỗi hệ thống',
        });
    }
};

// Đăng xuất người dùng
const logoutUser = async (req, res) => {
    try {
        const token = req.cookies?.refresh_token;
        if (token) {
            try {
                const decoded = jwt.verify(token, env.refreshTokenSecret);
                await JwtService.revokeRefreshTokenForUser(decoded?.id);
            } catch (error) {
                // Ignore invalid/expired token on logout and continue clearing cookie.
            }
        }
        res.clearCookie('refresh_token', {
            httpOnly: true,
            secure: env.cookieSecure,
            sameSite: env.cookieSameSite,
            path: '/',
        });

        return res.status(200).json({
            status: 'OK',
            message: 'Đăng xuất thành công',
        });
    } catch (e) {
        return res.status(500).json({
            status: 'ERR',
            code: 'INTERNAL_ERROR',
            message: 'Lỗi hệ thống',
        });
    }
};


module.exports = {
    createUser,
    createUserByAdmin,
    loginUser,
    updateUser,
    deleteUser,
    getAllUser,
    getDetailsUser,
    refreshToken,
    logoutUser,
};





