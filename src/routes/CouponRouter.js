const express = require('express');
const router = express.Router();
const CouponController = require('../controllers/CouponController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { scopedRateLimit } = require('../middleware/securityMiddleware');

const couponValidateLimiter = scopedRateLimit({
    key: 'coupon-validate',
    windowMs: Number(process.env.COUPON_VALIDATE_RATE_LIMIT_WINDOW_MS || 60 * 1000),
    max: Number(process.env.COUPON_VALIDATE_RATE_LIMIT_MAX || 30),
    message: 'Kiểm tra mã giảm giá quá nhiều, vui lòng thử lại sau',
});

router.post('/create', authMiddleware, CouponController.createCoupon);
router.put('/update/:id', authMiddleware, CouponController.updateCoupon);
router.delete('/delete/:id', authMiddleware, CouponController.deleteCoupon);
router.get('/get-details/:id', authMiddleware, CouponController.getCouponDetail);
router.get('/getall', authMiddleware, CouponController.getAllCoupons);
router.post('/validate', couponValidateLimiter, CouponController.validateCouponCode);
router.get('/validate', couponValidateLimiter, CouponController.validateCouponCode);

module.exports = router;
