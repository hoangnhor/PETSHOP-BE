const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const { authMiddleware, authUserMiddleware } = require('../middleware/authMiddleware');
const { scopedRateLimit } = require('../middleware/securityMiddleware');
const { parsePositiveInteger } = require('../config/env');

const signInLimiter = scopedRateLimit({
    key: 'sign-in',
    windowMs: parsePositiveInteger(process.env.LOGIN_RATE_LIMIT_WINDOW_MS, {
        defaultValue: 15 * 60 * 1000,
        min: 1000,
        max: 24 * 60 * 60 * 1000,
    }),
    max: parsePositiveInteger(process.env.LOGIN_RATE_LIMIT_MAX, {
        defaultValue: 10,
        min: 1,
        max: 1000,
    }),
    message: 'Đăng nhập quá nhiều lần, vui lòng thử lại sau',
});

router.post('/sign-up', UserController.createUser);
router.post('/create', authMiddleware, UserController.createUserByAdmin);
router.post('/sign-in', signInLimiter, UserController.loginUser);
router.post('/log-out', UserController.logoutUser);
router.put('/update/:id', authUserMiddleware, UserController.updateUser);
router.delete('/delete/:id', authMiddleware, UserController.deleteUser);
router.get('/getall', authMiddleware, UserController.getAllUser);
router.get('/get-details/:id', authUserMiddleware, UserController.getDetailsUser);
router.post('/refresh-token', UserController.refreshToken);

module.exports = router;
