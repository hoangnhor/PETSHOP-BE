const WishlistService = require('../services/WishlistServices');
const { getResponseStatusCode } = require('../utils/httpStatus');
const { wrapController } = require('../utils/controllerWrapper');

const getMyWishlist = async (req, res) => {
    const response = await WishlistService.getWishlistByUser(req.userId);
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

const addWishlistItem = async (req, res) => {
    const response = await WishlistService.addProductToWishlist(req.userId, req.body?.productId);
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

const removeWishlistItem = async (req, res) => {
    const response = await WishlistService.removeProductFromWishlist(req.userId, req.params.productId);
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

const clearMyWishlist = async (req, res) => {
    const response = await WishlistService.clearWishlist(req.userId);
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

module.exports = {
    getMyWishlist: wrapController(getMyWishlist),
    addWishlistItem: wrapController(addWishlistItem),
    removeWishlistItem: wrapController(removeWishlistItem),
    clearMyWishlist: wrapController(clearMyWishlist),
};



