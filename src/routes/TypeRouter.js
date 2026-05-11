const express = require('express');
const router = express.Router();
const TypeController = require('../controllers/TypeController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.post('/create', authMiddleware, TypeController.createType); // Chỉ admin
router.get('/getall', TypeController.getAllType); // Mọi người
router.put('/update/:id', authMiddleware, TypeController.updateType);
router.delete('/delete/:id', authMiddleware, TypeController.deleteType);

module.exports = router;
