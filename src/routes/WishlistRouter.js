const express = require('express');
const router = express.Router();
const WishlistController = require('../controllers/WishlistController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/me', verifyToken, WishlistController.getMyWishlist);
router.post('/me/items', verifyToken, WishlistController.addWishlistItem);
router.delete('/me/items/:productId', verifyToken, WishlistController.removeWishlistItem);
router.delete('/me', verifyToken, WishlistController.clearMyWishlist);

module.exports = router;
