const express = require('express');
const router = express.Router();
const InventoryLogController = require('../controllers/InventoryLogController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/getall', authMiddleware, InventoryLogController.getInventoryLogs);

module.exports = router;
