const ReviewService = require('../services/ReviewServices');
const { getResponseStatusCode } = require('../utils/httpStatus');
const { wrapController } = require('../utils/controllerWrapper');

const createReview = async (req, res) => {
    const response = await ReviewService.createReview(req.userId, req.body);
    return res.status(getResponseStatusCode(response, 201)).json(response);
};

const updateReview = async (req, res) => {
    const response = await ReviewService.updateReview(req.params.id, req.userId, req.isAdmin, req.body);
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

const deleteReview = async (req, res) => {
    const response = await ReviewService.deleteReview(req.params.id, req.userId, req.isAdmin);
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

const getReviews = async (req, res) => {
    const response = await ReviewService.getReviews(req.query, req.userId, req.isAdmin);
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

module.exports = {
    createReview: wrapController(createReview, {
        onError: (error, req, res) => {
            if (error?.code === 11000) {
                return res.status(409).json({
                    status: 'ERR',
                    message: 'Bạn đã đánh giá sản phẩm này cho đơn hàng đã chọn',
                });
            }
            return undefined;
        },
    }),
    updateReview: wrapController(updateReview),
    deleteReview: wrapController(deleteReview),
    getReviews: wrapController(getReviews),
};


