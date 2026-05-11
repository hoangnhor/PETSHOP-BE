const express = require('express');
const router = express.Router();
const BillController = require('../controllers/BillController');
const { authMiddleware, verifyToken } = require('../middleware/authMiddleware');

router.post('/create', verifyToken, BillController.createBill);
router.get('/getall', verifyToken, BillController.getAllBill);
router.get('/get-details/:id', verifyToken, BillController.getDetailsBill);
router.patch('/update-status/:id', authMiddleware, BillController.updateBillStatus);
router.patch('/cancel/:id', verifyToken, BillController.cancelBill);
router.delete('/delete/:id', authMiddleware, BillController.deleteBill);

module.exports = router;
