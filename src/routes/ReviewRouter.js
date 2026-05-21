const express = require('express');
const router = express.Router();
const ReviewController = require('../controllers/ReviewController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/create', verifyToken, ReviewController.createReview);
router.put('/update/:id', verifyToken, ReviewController.updateReview);
router.delete('/delete/:id', verifyToken, ReviewController.deleteReview);
router.get('/getall', verifyToken, ReviewController.getReviews);
router.get('/public', ReviewController.getReviews);

module.exports = router;
