const UserServices = require('../services/UserServices');
const { getResponseStatusCode } = require('../utils/httpStatus');
const JwtService = require('../services/JwtServices');
const { env } = require('../config/env');
const { wrapController } = require('../utils/controllerWrapper');

const getRefreshTokenCookieOptions = () => ({
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite,
    path: '/',
    maxAge: env.refreshTokenCookieMaxAgeMs,
});

const createUser = async (req, res) => {
    const { password, confirmPassword } = req.body;
    if (password !== confirmPassword) {
        return res.status(400).json({
            status: 'ERR',
            message: 'Mật khẩu không khớp',
        });
    }
    const response = await UserServices.createUser(req.body);
    return res.status(getResponseStatusCode(response, 201)).json(response);
};

const createUserByAdmin = async (req, res) => {
    const response = await UserServices.createUser(req.body, true);
    return res.status(getResponseStatusCode(response, 201)).json(response);
};

const loginUser = async (req, res) => {
    const response = await UserServices.loginUser(req.body);
    if (response.status === 'OK') {
        const { refresh_token, ...newResponse } = response;
        res.cookie('refresh_token', refresh_token, getRefreshTokenCookieOptions());
        return res.status(200).json(newResponse);
    }
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

const updateUser = async (req, res) => {
    const response = await UserServices.updateUser(req.params.id, req.body, req.isAdmin);
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

const deleteUser = async (req, res) => {
    const response = await UserServices.deleteUser(req.params.id, req.userId);
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

const getAllUser = async (req, res) => {
    const response = await UserServices.getAllUser(req.query);
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

const getDetailsUser = async (req, res) => {
    const response = await UserServices.getDetailsUser(req.params.id);
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

const refreshToken = async (req, res) => {
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
};

// Đăng xuất người dùng
const logoutUser = async (req, res) => {
    const token = req.cookies?.refresh_token;
    if (token) {
        await JwtService.revokeRefreshTokenFromToken(token);
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
};


module.exports = {
    createUser: wrapController(createUser),
    createUserByAdmin: wrapController(createUserByAdmin),
    loginUser: wrapController(loginUser),
    updateUser: wrapController(updateUser),
    deleteUser: wrapController(deleteUser),
    getAllUser: wrapController(getAllUser),
    getDetailsUser: wrapController(getDetailsUser),
    refreshToken: wrapController(refreshToken),
    logoutUser: wrapController(logoutUser),
};





