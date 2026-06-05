const CartService = require('../services/CartServices');
const { getResponseStatusCode } = require('../utils/httpStatus');
const { wrapController } = require('../utils/controllerWrapper');

const getMyCart = async (req, res) => {
    const response = await CartService.getCartByUser(req.userId);
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

const upsertMyCart = async (req, res) => {
    const response = await CartService.upsertCartItems(req.userId, req.body);
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

const addItemToMyCart = async (req, res) => {
    const response = await CartService.addToCart(req.userId, req.body);
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

const removeItemFromMyCart = async (req, res) => {
    const response = await CartService.removeCartItem(req.userId, req.params.productId);
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

const clearMyCart = async (req, res) => {
    const response = await CartService.clearCart(req.userId);
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

module.exports = {
    getMyCart: wrapController(getMyCart),
    upsertMyCart: wrapController(upsertMyCart),
    addItemToMyCart: wrapController(addItemToMyCart),
    removeItemFromMyCart: wrapController(removeItemFromMyCart),
    clearMyCart: wrapController(clearMyCart),
};



