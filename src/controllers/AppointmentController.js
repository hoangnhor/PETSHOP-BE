const AppointmentService = require('../services/AppointmentServices');
const { getResponseStatusCode } = require('../utils/httpStatus');
const { wrapController } = require('../utils/controllerWrapper');

const createAppointment = async (req, res) => {
    const response = await AppointmentService.createAppointment(req.userId, req.body, req.isAdmin);
    return res.status(getResponseStatusCode(response, 201)).json(response);
};

const updateAppointment = async (req, res) => {
    const response = await AppointmentService.updateAppointment(req.params.id, req.userId, req.isAdmin, req.body);
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

const cancelAppointment = async (req, res) => {
    const response = await AppointmentService.cancelAppointment(req.params.id, req.userId, req.isAdmin, req.body?.cancelReason);
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

const getAppointmentDetail = async (req, res) => {
    const response = await AppointmentService.getAppointmentDetail(req.params.id, req.userId, req.isAdmin);
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

const getAppointments = async (req, res) => {
    const response = await AppointmentService.getAppointments(req.userId, req.isAdmin, req.query);
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

const getAvailableSlots = async (req, res) => {
    const response = await AppointmentService.getAvailableSlots(req.query);
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

module.exports = {
    createAppointment: wrapController(createAppointment),
    updateAppointment: wrapController(updateAppointment),
    cancelAppointment: wrapController(cancelAppointment),
    getAppointmentDetail: wrapController(getAppointmentDetail),
    getAppointments: wrapController(getAppointments),
    getAvailableSlots: wrapController(getAvailableSlots),
};



