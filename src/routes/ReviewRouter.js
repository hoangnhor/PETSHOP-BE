const express = require('express');
const router = express.Router();
const ReviewController = require('../controllers/ReviewController');
const { verifyToken } = require('../middleware/authMiddleware');
const { validateBodyFields, validateParam } = require('../middleware/validationMiddleware');

router.post('/create', verifyToken, validateBodyFields(['productId', 'rating', 'billId'], 'productId, rating, billId là bắt buộc'), ReviewController.createReview);
router.put('/update/:id', verifyToken, validateParam('id', 'Review ID'), ReviewController.updateReview);
router.delete('/delete/:id', verifyToken, validateParam('id', 'Review ID'), ReviewController.deleteReview);
router.get('/getall', verifyToken, ReviewController.getReviews);
router.get('/public', ReviewController.getReviews);

module.exports = router;
