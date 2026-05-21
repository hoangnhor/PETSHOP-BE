const ServiceService = require('../services/ServiceServices');

const createService = async (req, res) => {
    try {
        const response = await ServiceService.createService(req.body);
        return res.status(response.status === 'OK' ? 201 : 400).json(response);
    } catch (error) {
        return res.status(500).json({ status: 'ERR', code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' });
    }
};

const updateService = async (req, res) => {
    try {
        const response = await ServiceService.updateService(req.params.id, req.body);
        return res.status(response.status === 'OK' ? 200 : 400).json(response);
    } catch (error) {
        return res.status(500).json({ status: 'ERR', code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' });
    }
};

const deleteService = async (req, res) => {
    try {
        const response = await ServiceService.deleteService(req.params.id);
        return res.status(response.status === 'OK' ? 200 : 400).json(response);
    } catch (error) {
        return res.status(500).json({ status: 'ERR', code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' });
    }
};

const getServiceDetail = async (req, res) => {
    try {
        const response = await ServiceService.getServiceDetail(req.params.id);
        return res.status(response.status === 'OK' ? 200 : 400).json(response);
    } catch (error) {
        return res.status(500).json({ status: 'ERR', code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' });
    }
};

const getServiceDetailBySlug = async (req, res) => {
    try {
        const response = await ServiceService.getServiceDetailBySlug(req.params.slug);
        return res.status(response.status === 'OK' ? 200 : 404).json(response);
    } catch (error) {
        return res.status(500).json({ status: 'ERR', code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' });
    }
};

const getAllServices = async (req, res) => {
    try {
        const response = await ServiceService.getAllServices(req.query);
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({ status: 'ERR', code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' });
    }
};

module.exports = {
    createService,
    updateService,
    deleteService,
    getServiceDetail,
    getServiceDetailBySlug,
    getAllServices,
};
