const express = require('express');
const router = express.Router();
const BillController = require('../controllers/BillController');
const { authMiddleware, verifyToken } = require('../middleware/authMiddleware');
const { scopedRateLimit } = require('../middleware/securityMiddleware');
const { validateParam } = require('../middleware/validationMiddleware');
const { parsePositiveInteger, env } = require('../config/env');

const createBillLimiter = scopedRateLimit({
    key: 'bill-create',
    windowMs: parsePositiveInteger(process.env.BILL_CREATE_RATE_LIMIT_WINDOW_MS, {
        defaultValue: 60 * 1000,
        min: 1000,
        max: 60 * 60 * 1000,
    }),
    max: parsePositiveInteger(process.env.BILL_CREATE_RATE_LIMIT_MAX, {
        defaultValue: 8,
        min: 1,
        max: 200,
    }),
    message: 'Tạo đơn hàng quá nhanh, vui lòng thử lại sau',
});

const paymentWebhookLimiter = scopedRateLimit({
    key: 'payment-webhook',
    windowMs: parsePositiveInteger(process.env.PAYMENT_WEBHOOK_RATE_LIMIT_WINDOW_MS, {
        defaultValue: 60 * 1000,
        min: 1000,
        max: 60 * 60 * 1000,
    }),
    max: parsePositiveInteger(process.env.PAYMENT_WEBHOOK_RATE_LIMIT_MAX, {
        defaultValue: 120,
        min: 1,
        max: 10000,
    }),
    message: 'Webhook thanh toán gửi quá nhiều yêu cầu',
});

router.post('/create', createBillLimiter, verifyToken, BillController.createBill);
router.get('/getall', verifyToken, BillController.getAllBill);
router.get('/get-details/:id', verifyToken, validateParam('id', 'Bill ID'), BillController.getDetailsBill);
router.patch('/update-status/:id', authMiddleware, validateParam('id', 'Bill ID'), BillController.updateBillStatus);
router.patch('/cancel/:id', verifyToken, validateParam('id', 'Bill ID'), BillController.cancelBill);
router.delete('/delete/:id', authMiddleware, validateParam('id', 'Bill ID'), BillController.deleteBill);
router.post(
    '/payment-callback',
    paymentWebhookLimiter,
    (req, res, next) => {
        if (!env.isProduction || env.paymentWebhookEnabled) return next();
        return res.status(503).json({
            status: 'ERR',
            code: 'WEBHOOK_DISABLED',
            message: 'Webhook thanh toán đang tạm tắt',
        });
    },
    BillController.confirmPaymentWebhook
);

module.exports = router;
