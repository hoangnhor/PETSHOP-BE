const express = require('express');
const router = express.Router();
const ProductController = require('../controllers/ProductController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { validateBodyFields, validateParam, validateQueryParam } = require('../middleware/validationMiddleware');

router.post('/create', authMiddleware, validateBodyFields(['name', 'type', 'price', 'countInStock'], 'Đầu vào bắt buộc: name, type, price, countInStock'), ProductController.createProduct); // Chỉ admin
router.put('/update/:id', authMiddleware, validateParam('id', 'Product ID'), ProductController.updateProduct); // Chỉ admin
router.delete('/delete/:id', authMiddleware, validateParam('id', 'Product ID'), ProductController.deleteProduct); // Chỉ admin
router.get('/getall', ProductController.getAllProduct); // Mọi người
router.get('/get-details/:id', validateParam('id', 'Product ID'), ProductController.getDetailsProduct); // Mọi người
router.get('/search', validateQueryParam('keyword', 'Keyword'), ProductController.searchProduct);
module.exports = router;
