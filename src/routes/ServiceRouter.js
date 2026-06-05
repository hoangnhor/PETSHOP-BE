const express = require('express');
const router = express.Router();
const ServiceController = require('../controllers/ServiceController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { validateBodyFields, validateParam } = require('../middleware/validationMiddleware');

router.post('/create', authMiddleware, validateBodyFields(['code', 'name', 'slug', 'durationMin', 'price'], 'code, name, slug, durationMin, price là bắt buộc'), ServiceController.createService);
router.put('/update/:id', authMiddleware, validateParam('id', 'Service ID'), ServiceController.updateService);
router.delete('/delete/:id', authMiddleware, validateParam('id', 'Service ID'), ServiceController.deleteService);
router.get('/get-details/:id', validateParam('id', 'Service ID'), ServiceController.getServiceDetail);
router.get('/slug/:slug', validateParam('slug', 'slug'), ServiceController.getServiceDetailBySlug);
router.get('/getall', ServiceController.getAllServices);

module.exports = router;
