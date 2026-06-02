const WishlistService = require('../services/WishlistServices');
const { getResponseStatusCode } = require('../utils/httpStatus');

const getMyWishlist = async (req, res) => {
    try {
        const response = await WishlistService.getWishlistByUser(req.userId);
        return res.status(getResponseStatusCode(response, 200)).json(response);
    } catch (error) {
        return res.status(500).json({ status: 'ERR', code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' });
    }
};

const addWishlistItem = async (req, res) => {
    try {
        const response = await WishlistService.addProductToWishlist(req.userId, req.body?.productId);
        return res.status(getResponseStatusCode(response, 200)).json(response);
    } catch (error) {
        return res.status(500).json({ status: 'ERR', code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' });
    }
};

const removeWishlistItem = async (req, res) => {
    try {
        const response = await WishlistService.removeProductFromWishlist(req.userId, req.params.productId);
        return res.status(getResponseStatusCode(response, 200)).json(response);
    } catch (error) {
        return res.status(500).json({ status: 'ERR', code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' });
    }
};

const clearMyWishlist = async (req, res) => {
    try {
        const response = await WishlistService.clearWishlist(req.userId);
        return res.status(getResponseStatusCode(response, 200)).json(response);
    } catch (error) {
        return res.status(500).json({ status: 'ERR', code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' });
    }
};

module.exports = {
    getMyWishlist,
    addWishlistItem,
    removeWishlistItem,
    clearMyWishlist,
};



