const express = require('express');
const router = express.Router();
const CartController = require('../controllers/CartController');
const { verifyToken } = require('../middleware/authMiddleware');
const { validateParam } = require('../middleware/validationMiddleware');

router.get('/me', verifyToken, CartController.getMyCart);
router.put('/me', verifyToken, CartController.upsertMyCart);
router.post('/me/items', verifyToken, CartController.addItemToMyCart);
router.delete('/me/items/:productId', verifyToken, validateParam('productId', 'Product ID'), CartController.removeItemFromMyCart);
router.delete('/me', verifyToken, CartController.clearMyCart);

module.exports = router;
