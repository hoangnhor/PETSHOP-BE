const express = require('express');
const router = express.Router();
const CouponController = require('../controllers/CouponController');
const { authMiddleware, attachUserIfValidToken } = require('../middleware/authMiddleware');
const { scopedRateLimit } = require('../middleware/securityMiddleware');
const { validateBodyFields, validateParam, validateQueryParam } = require('../middleware/validationMiddleware');
const { parsePositiveInteger } = require('../config/env');

const couponValidateLimiter = scopedRateLimit({
    key: 'coupon-validate',
    windowMs: parsePositiveInteger(process.env.COUPON_VALIDATE_RATE_LIMIT_WINDOW_MS, {
        defaultValue: 60 * 1000,
        min: 1000,
        max: 60 * 60 * 1000,
    }),
    max: parsePositiveInteger(process.env.COUPON_VALIDATE_RATE_LIMIT_MAX, {
        defaultValue: 30,
        min: 1,
        max: 500,
    }),
    message: 'Kiểm tra mã giảm giá quá nhiều, vui lòng thử lại sau',
});

router.post('/create', authMiddleware, validateBodyFields(['code', 'name', 'discountType', 'discountValue'], 'code, name, discountType, discountValue là bắt buộc'), CouponController.createCoupon);
router.put('/update/:id', authMiddleware, validateParam('id', 'Coupon ID'), CouponController.updateCoupon);
router.delete('/delete/:id', authMiddleware, validateParam('id', 'Coupon ID'), CouponController.deleteCoupon);
router.get('/get-details/:id', authMiddleware, validateParam('id', 'Coupon ID'), CouponController.getCouponDetail);
router.get('/getall', authMiddleware, CouponController.getAllCoupons);
router.post('/validate', attachUserIfValidToken, couponValidateLimiter, validateBodyFields(['code'], 'Mã giảm giá là bắt buộc'), CouponController.validateCouponCode);
router.get('/validate', attachUserIfValidToken, couponValidateLimiter, validateQueryParam('code', 'Mã giảm giá'), CouponController.validateCouponCode);

module.exports = router;
