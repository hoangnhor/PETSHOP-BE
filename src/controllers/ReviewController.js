const ReviewService = require('../services/ReviewServices');
const { getResponseStatusCode } = require('../utils/httpStatus');

const createReview = async (req, res) => {
    try {
        const response = await ReviewService.createReview(req.userId, req.body);
        return res.status(getResponseStatusCode(response, 201)).json(response);
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({ status: 'ERR', message: 'Bạn đã đánh giá sản phẩm này cho đơn hàng đã chọn' });
        }
        return res.status(500).json({ status: 'ERR', code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' });
    }
};

const updateReview = async (req, res) => {
    try {
        const response = await ReviewService.updateReview(req.params.id, req.userId, req.isAdmin, req.body);
        return res.status(getResponseStatusCode(response, 200)).json(response);
    } catch (error) {
        return res.status(500).json({ status: 'ERR', code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' });
    }
};

const deleteReview = async (req, res) => {
    try {
        const response = await ReviewService.deleteReview(req.params.id, req.userId, req.isAdmin);
        return res.status(getResponseStatusCode(response, 200)).json(response);
    } catch (error) {
        return res.status(500).json({ status: 'ERR', code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' });
    }
};

const getReviews = async (req, res) => {
    try {
        const response = await ReviewService.getReviews(req.query, req.userId, req.isAdmin);
        return res.status(getResponseStatusCode(response, 200)).json(response);
    } catch (error) {
        return res.status(500).json({ status: 'ERR', code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' });
    }
};

module.exports = {
    createReview,
    updateReview,
    deleteReview,
    getReviews,
};


