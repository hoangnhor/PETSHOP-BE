const CartService = require('../services/CartServices');
const { getResponseStatusCode } = require('../utils/httpStatus');

const getMyCart = async (req, res) => {
    try {
        const response = await CartService.getCartByUser(req.userId);
        return res.status(getResponseStatusCode(response, 200)).json(response);
    } catch (error) {
        return res.status(500).json({ status: 'ERR', code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' });
    }
};

const upsertMyCart = async (req, res) => {
    try {
        const response = await CartService.upsertCartItems(req.userId, req.body);
        return res.status(getResponseStatusCode(response, 200)).json(response);
    } catch (error) {
        return res.status(500).json({ status: 'ERR', code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' });
    }
};

const addItemToMyCart = async (req, res) => {
    try {
        const response = await CartService.addToCart(req.userId, req.body);
        return res.status(getResponseStatusCode(response, 200)).json(response);
    } catch (error) {
        return res.status(500).json({ status: 'ERR', code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' });
    }
};

const removeItemFromMyCart = async (req, res) => {
    try {
        const response = await CartService.removeCartItem(req.userId, req.params.productId);
        return res.status(getResponseStatusCode(response, 200)).json(response);
    } catch (error) {
        return res.status(500).json({ status: 'ERR', code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' });
    }
};

const clearMyCart = async (req, res) => {
    try {
        const response = await CartService.clearCart(req.userId);
        return res.status(getResponseStatusCode(response, 200)).json(response);
    } catch (error) {
        return res.status(500).json({ status: 'ERR', code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' });
    }
};

module.exports = {
    getMyCart,
    upsertMyCart,
    addItemToMyCart,
    removeItemFromMyCart,
    clearMyCart,
};



