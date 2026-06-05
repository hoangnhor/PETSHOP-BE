const express = require('express');
const router = express.Router();
const WishlistController = require('../controllers/WishlistController');
const { verifyToken } = require('../middleware/authMiddleware');
const { validateParam } = require('../middleware/validationMiddleware');

router.get('/me', verifyToken, WishlistController.getMyWishlist);
router.post('/me/items', verifyToken, WishlistController.addWishlistItem);
router.delete('/me/items/:productId', verifyToken, validateParam('productId', 'Product ID'), WishlistController.removeWishlistItem);
router.delete('/me', verifyToken, WishlistController.clearMyWishlist);

module.exports = router;
