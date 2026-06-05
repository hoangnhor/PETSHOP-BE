const express = require('express');
const router = express.Router();
const AppointmentController = require('../controllers/AppointmentController');
const { verifyToken, authMiddleware } = require('../middleware/authMiddleware');
const { validateBodyFields, validateParam, validateQueryParam } = require('../middleware/validationMiddleware');

router.post('/create', verifyToken, validateBodyFields(['petId', 'serviceIds', 'scheduleAt'], 'petId, serviceIds, scheduleAt là bắt buộc'), AppointmentController.createAppointment);
router.put('/update/:id', verifyToken, validateParam('id', 'Appointment ID'), AppointmentController.updateAppointment);
router.patch('/cancel/:id', verifyToken, validateParam('id', 'Appointment ID'), AppointmentController.cancelAppointment);
router.get('/get-details/:id', verifyToken, validateParam('id', 'Appointment ID'), AppointmentController.getAppointmentDetail);
router.get('/getall', verifyToken, AppointmentController.getAppointments);
router.get('/admin/getall', authMiddleware, AppointmentController.getAppointments);
router.get('/availability', validateQueryParam('date', 'date'), validateQueryParam('serviceIds', 'serviceIds'), AppointmentController.getAvailableSlots);

module.exports = router;
