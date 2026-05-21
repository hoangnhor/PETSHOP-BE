const AppointmentService = require('../services/AppointmentServices');

const createAppointment = async (req, res) => {
    try {
        const response = await AppointmentService.createAppointment(req.userId, req.body, req.isAdmin);
        return res.status(response.status === 'OK' ? 201 : 400).json(response);
    } catch (error) {
        return res.status(500).json({ status: 'ERR', code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' });
    }
};

const updateAppointment = async (req, res) => {
    try {
        const response = await AppointmentService.updateAppointment(req.params.id, req.userId, req.isAdmin, req.body);
        return res.status(response.status === 'OK' ? 200 : 400).json(response);
    } catch (error) {
        return res.status(500).json({ status: 'ERR', code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' });
    }
};

const cancelAppointment = async (req, res) => {
    try {
        const response = await AppointmentService.cancelAppointment(req.params.id, req.userId, req.isAdmin, req.body?.cancelReason);
        return res.status(response.status === 'OK' ? 200 : 400).json(response);
    } catch (error) {
        return res.status(500).json({ status: 'ERR', code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' });
    }
};

const getAppointmentDetail = async (req, res) => {
    try {
        const response = await AppointmentService.getAppointmentDetail(req.params.id, req.userId, req.isAdmin);
        return res.status(response.status === 'OK' ? 200 : 400).json(response);
    } catch (error) {
        return res.status(500).json({ status: 'ERR', code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' });
    }
};

const getAppointments = async (req, res) => {
    try {
        const response = await AppointmentService.getAppointments(req.userId, req.isAdmin, req.query);
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({ status: 'ERR', code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' });
    }
};

const getAvailableSlots = async (req, res) => {
    try {
        const response = await AppointmentService.getAvailableSlots(req.query);
        return res.status(response.status === 'OK' ? 200 : 400).json(response);
    } catch (error) {
        return res.status(500).json({ status: 'ERR', code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' });
    }
};

module.exports = {
    createAppointment,
    updateAppointment,
    cancelAppointment,
    getAppointmentDetail,
    getAppointments,
    getAvailableSlots,
};
