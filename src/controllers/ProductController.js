const ProductService = require('../services/ProductServices');

const createProduct = async (req, res) => {
    try {
        const { name, type, price, countInStock } = req.body;
        if (!name || !type || price === undefined || countInStock === undefined) {
            return res.status(400).json({
                status: 'ERR',
                message: 'Đầu vào bắt buộc: name, type, price, countInStock',
            });
        }
        const response = await ProductService.createProduct(req.body);
        return res.status(response.status === 'OK' ? 201 : 400).json(response);
    } catch (e) {
        return res.status(500).json({
            status: 'ERR',
            code: 'INTERNAL_ERROR',
            message: 'Lỗi hệ thống',
        });
    }
};

const updateProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const data = req.body;
        if (!productId) {
            return res.status(400).json({
                status: 'ERR',
                message: 'Product ID bắt buộc',
            });
        }
        const response = await ProductService.updateProduct(productId, data);
        return res.status(response.status === 'OK' ? 200 : 400).json(response);
    } catch (e) {
        return res.status(500).json({
            status: 'ERR',
            code: 'INTERNAL_ERROR',
            message: 'Lỗi hệ thống',
        });
    }
};

const getDetailsProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        if (!productId) {
            return res.status(400).json({
                status: 'ERR',
                message: 'Product ID bắt buộc',
            });
        }
        const response = await ProductService.getDetailsProduct(productId);
        return res.status(response.status === 'OK' ? 200 : 400).json(response);
    } catch (e) {
        return res.status(500).json({
            status: 'ERR',
            code: 'INTERNAL_ERROR',
            message: 'Lỗi hệ thống',
        });
    }
};

const deleteProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        if (!productId) {
            return res.status(400).json({
                status: 'ERR',
                message: 'Product ID bắt buộc',
            });
        }
        const response = await ProductService.deleteProduct(productId);
        return res.status(response.status === 'OK' ? 200 : 400).json(response);
    } catch (e) {
        return res.status(500).json({
            status: 'ERR',
            code: 'INTERNAL_ERROR',
            message: 'Lỗi hệ thống',
        });
    }
};

const getAllProduct = async (req, res) => {
    try {
        const response = await ProductService.getAllProduct(req.query);
        return res.status(response.status === 'OK' ? 200 : 400).json(response);
    } catch (e) {
        return res.status(500).json({
            status: 'ERR',
            code: 'INTERNAL_ERROR',
            message: 'Lỗi hệ thống',
        });
    }
};

const searchProduct = async (req, res) => {
    try {
        const { keyword } = req.query;
        if (!keyword) {
            return res.status(400).json({
                status: 'ERR',
                message: 'Keyword là bắt buộc',
            });
        }
        const response = await ProductService.searchProduct(keyword);
        return res.status(response.status === 'OK' ? 200 : 400).json(response);
    } catch (e) {
        return res.status(500).json({
            status: 'ERR',
            code: 'INTERNAL_ERROR',
            message: 'Lỗi hệ thống',
        });
    }
};

module.exports = {
    createProduct,
    updateProduct,
    getDetailsProduct,
    deleteProduct,
    getAllProduct,
    searchProduct,
};


