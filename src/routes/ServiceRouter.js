const express = require('express');
const router = express.Router();
const ServiceController = require('../controllers/ServiceController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.post('/create', authMiddleware, ServiceController.createService);
router.put('/update/:id', authMiddleware, ServiceController.updateService);
router.delete('/delete/:id', authMiddleware, ServiceController.deleteService);
router.get('/get-details/:id', ServiceController.getServiceDetail);
router.get('/slug/:slug', ServiceController.getServiceDetailBySlug);
router.get('/getall', ServiceController.getAllServices);

module.exports = router;
