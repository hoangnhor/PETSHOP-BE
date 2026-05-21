const express = require('express');
const router = express.Router();
const BillController = require('../controllers/BillController');
const { authMiddleware, verifyToken } = require('../middleware/authMiddleware');
const { scopedRateLimit } = require('../middleware/securityMiddleware');

const createBillLimiter = scopedRateLimit({
    key: 'bill-create',
    windowMs: Number(process.env.BILL_CREATE_RATE_LIMIT_WINDOW_MS || 60 * 1000),
    max: Number(process.env.BILL_CREATE_RATE_LIMIT_MAX || 8),
    message: 'Tạo đơn hàng quá nhanh, vui lòng thử lại sau',
});

router.post('/create', createBillLimiter, verifyToken, BillController.createBill);
router.get('/getall', verifyToken, BillController.getAllBill);
router.get('/get-details/:id', verifyToken, BillController.getDetailsBill);
router.patch('/update-status/:id', authMiddleware, BillController.updateBillStatus);
router.patch('/cancel/:id', verifyToken, BillController.cancelBill);
router.delete('/delete/:id', authMiddleware, BillController.deleteBill);

module.exports = router;
