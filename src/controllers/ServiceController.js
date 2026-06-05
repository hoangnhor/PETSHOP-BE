const ServiceService = require('../services/ServiceServices');
const { getResponseStatusCode } = require('../utils/httpStatus');
const { wrapController } = require('../utils/controllerWrapper');

const createService = async (req, res) => {
    const response = await ServiceService.createService(req.body);
    return res.status(getResponseStatusCode(response, 201)).json(response);
};

const updateService = async (req, res) => {
    const response = await ServiceService.updateService(req.params.id, req.body);
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

const deleteService = async (req, res) => {
    const response = await ServiceService.deleteService(req.params.id);
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

const getServiceDetail = async (req, res) => {
    const response = await ServiceService.getServiceDetail(req.params.id);
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

const getServiceDetailBySlug = async (req, res) => {
    const response = await ServiceService.getServiceDetailBySlug(req.params.slug);
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

const getAllServices = async (req, res) => {
    const response = await ServiceService.getAllServices(req.query);
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

module.exports = {
    createService: wrapController(createService),
    updateService: wrapController(updateService),
    deleteService: wrapController(deleteService),
    getServiceDetail: wrapController(getServiceDetail),
    getServiceDetailBySlug: wrapController(getServiceDetailBySlug),
    getAllServices: wrapController(getAllServices),
};



