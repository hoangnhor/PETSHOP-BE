const express = require('express');
const router = express.Router();
const AppointmentController = require('../controllers/AppointmentController');
const { verifyToken, authMiddleware } = require('../middleware/authMiddleware');

router.post('/create', verifyToken, AppointmentController.createAppointment);
router.put('/update/:id', verifyToken, AppointmentController.updateAppointment);
router.patch('/cancel/:id', verifyToken, AppointmentController.cancelAppointment);
router.get('/get-details/:id', verifyToken, AppointmentController.getAppointmentDetail);
router.get('/getall', verifyToken, AppointmentController.getAppointments);
router.get('/admin/getall', authMiddleware, AppointmentController.getAppointments);
router.get('/availability', AppointmentController.getAvailableSlots);

module.exports = router;
