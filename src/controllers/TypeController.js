const TypeService = require('../services/TypeServices');
const { getResponseStatusCode } = require('../utils/httpStatus');
const { wrapController } = require('../utils/controllerWrapper');

const createType = async (req, res) => {
    const response = await TypeService.createType(req.body);
    return res.status(getResponseStatusCode(response, 201)).json(response);
};

const getAllType = async (req, res) => {
    const response = await TypeService.getAllType();
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

const updateType = async (req, res) => {
    const response = await TypeService.updateType(req.params.id, req.body);
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

const deleteType = async (req, res) => {
    const response = await TypeService.deleteType(req.params.id);
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

module.exports = {
    createType: wrapController(createType),
    getAllType: wrapController(getAllType),
    updateType: wrapController(updateType),
    deleteType: wrapController(deleteType),
};




