const CouponService = require('../services/CouponServices');
const { getResponseStatusCode } = require('../utils/httpStatus');
const { wrapController } = require('../utils/controllerWrapper');

const createCoupon = async (req, res) => {
    const response = await CouponService.createCoupon(req.body);
    return res.status(getResponseStatusCode(response, 201)).json(response);
};

const updateCoupon = async (req, res) => {
    const response = await CouponService.updateCoupon(req.params.id, req.body);
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

const deleteCoupon = async (req, res) => {
    const response = await CouponService.deleteCoupon(req.params.id);
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

const getCouponDetail = async (req, res) => {
    const response = await CouponService.getCouponDetail(req.params.id);
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

const getAllCoupons = async (req, res) => {
    const response = await CouponService.getAllCoupons(req.query);
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

const validateCouponCode = async (req, res) => {
    const response = await CouponService.validateCouponCode(
        req.body?.code || req.query?.code,
        req.body?.orderValue || req.query?.orderValue || 0,
        req.userId || null
    );
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

module.exports = {
    createCoupon: wrapController(createCoupon),
    updateCoupon: wrapController(updateCoupon),
    deleteCoupon: wrapController(deleteCoupon),
    getCouponDetail: wrapController(getCouponDetail),
    getAllCoupons: wrapController(getAllCoupons),
    validateCouponCode: wrapController(validateCouponCode),
};



