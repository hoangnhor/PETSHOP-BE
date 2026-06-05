const ProductService = require('../services/ProductServices');
const { getResponseStatusCode } = require('../utils/httpStatus');
const { wrapController } = require('../utils/controllerWrapper');

const createProduct = async (req, res) => {
    const response = await ProductService.createProduct(req.body);
    return res.status(getResponseStatusCode(response, 201)).json(response);
};

const updateProduct = async (req, res) => {
    const response = await ProductService.updateProduct(req.params.id, req.body);
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

const getDetailsProduct = async (req, res) => {
    const response = await ProductService.getDetailsProduct(req.params.id);
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

const deleteProduct = async (req, res) => {
    const response = await ProductService.deleteProduct(req.params.id);
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

const getAllProduct = async (req, res) => {
    const response = await ProductService.getAllProduct(req.query);
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

const searchProduct = async (req, res) => {
    const response = await ProductService.searchProduct(req.query.keyword);
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

module.exports = {
    createProduct: wrapController(createProduct),
    updateProduct: wrapController(updateProduct),
    getDetailsProduct: wrapController(getDetailsProduct),
    deleteProduct: wrapController(deleteProduct),
    getAllProduct: wrapController(getAllProduct),
    searchProduct: wrapController(searchProduct),
};




