const TypeService = require('../services/TypeServices');
const { getResponseStatusCode } = require('../utils/httpStatus');

const createType = async (req, res) => {
    try {
        const response = await TypeService.createType(req.body);
        return res.status(getResponseStatusCode(response, 201)).json(response);
    } catch (error) {
        return res.status(500).json({
            status: 'ERR',
            code: 'INTERNAL_ERROR',
            message: 'Lỗi hệ thống',
        });
    }
};

const getAllType = async (req, res) => {
    try {
        const response = await TypeService.getAllType();
        return res.status(getResponseStatusCode(response, 200)).json(response);
    } catch (error) {
        return res.status(500).json({
            status: 'ERR',
            code: 'INTERNAL_ERROR',
            message: 'Lỗi hệ thống',
        });
    }
};

const updateType = async (req, res) => {
    try {
        const response = await TypeService.updateType(req.params.id, req.body);
        return res.status(getResponseStatusCode(response, 200)).json(response);
    } catch (error) {
        return res.status(500).json({
            status: 'ERR',
            code: 'INTERNAL_ERROR',
            message: 'Lỗi hệ thống',
        });
    }
};

const deleteType = async (req, res) => {
    try {
        const response = await TypeService.deleteType(req.params.id);
        return res.status(getResponseStatusCode(response, 200)).json(response);
    } catch (error) {
        return res.status(500).json({
            status: 'ERR',
            code: 'INTERNAL_ERROR',
            message: 'Lỗi hệ thống',
        });
    }
};

module.exports = {
    createType,
    getAllType,
    updateType,
    deleteType,
};




