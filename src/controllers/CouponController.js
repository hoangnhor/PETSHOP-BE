const CouponService = require('../services/CouponServices');

const createCoupon = async (req, res) => {
    try {
        const response = await CouponService.createCoupon(req.body);
        return res.status(response.status === 'OK' ? 201 : 400).json(response);
    } catch (error) {
        return res.status(500).json({ status: 'ERR', code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' });
    }
};

const updateCoupon = async (req, res) => {
    try {
        const response = await CouponService.updateCoupon(req.params.id, req.body);
        return res.status(response.status === 'OK' ? 200 : 400).json(response);
    } catch (error) {
        return res.status(500).json({ status: 'ERR', code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' });
    }
};

const deleteCoupon = async (req, res) => {
    try {
        const response = await CouponService.deleteCoupon(req.params.id);
        return res.status(response.status === 'OK' ? 200 : 400).json(response);
    } catch (error) {
        return res.status(500).json({ status: 'ERR', code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' });
    }
};

const getCouponDetail = async (req, res) => {
    try {
        const response = await CouponService.getCouponDetail(req.params.id);
        return res.status(response.status === 'OK' ? 200 : 400).json(response);
    } catch (error) {
        return res.status(500).json({ status: 'ERR', code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' });
    }
};

const getAllCoupons = async (req, res) => {
    try {
        const response = await CouponService.getAllCoupons(req.query);
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({ status: 'ERR', code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' });
    }
};

const validateCouponCode = async (req, res) => {
    try {
        const response = await CouponService.validateCouponCode(req.body?.code || req.query?.code, req.body?.orderValue || req.query?.orderValue || 0);
        return res.status(response.status === 'OK' ? 200 : 400).json(response);
    } catch (error) {
        return res.status(500).json({ status: 'ERR', code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' });
    }
};

module.exports = {
    createCoupon,
    updateCoupon,
    deleteCoupon,
    getCouponDetail,
    getAllCoupons,
    validateCouponCode,
};
