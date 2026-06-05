const mongoose = require('mongoose');
const Review = require('../models/ReviewModel');
const Bill = require('../models/BillModel');
const { loadVisibleProductById } = require('../utils/productVisibility');

const canReviewByBill = async (userId, productId, billId) => {
    if (!billId) return false;
    if (!mongoose.isValidObjectId(billId)) return false;
    const bill = await Bill.findOne({
        _id: billId,
        iduser: userId,
        orderStatus: { $in: ['delivered'] },
        'items.idsp': productId,
    }).lean();
    return Boolean(bill);
};

const createReview = async (userId, payload) => {
    const { productId, rating, title = '', content = '', images = [], billId = null } = payload;
    if (!productId || !mongoose.isValidObjectId(productId)) return { status: 'ERR', message: 'productId không hợp lệ' };
    if (!Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) return { status: 'ERR', message: 'rating phải từ 1 đến 5' };
    const product = await loadVisibleProductById(productId);
    if (!product) return { status: 'ERR', message: 'Sản phẩm không tồn tại hoặc đã ngừng bán' };

    if (!billId) return { status: 'ERR', message: 'Cần billId để đánh giá sản phẩm đã mua' };
    const isVerifiedPurchase = await canReviewByBill(userId, productId, billId);
    if (!isVerifiedPurchase) return { status: 'ERR', message: 'Bạn chỉ có thể đánh giá sản phẩm trong đơn đã giao của chính bạn' };

    const created = await Review.create({
        productId,
        userId,
        billId: billId && mongoose.isValidObjectId(billId) ? billId : null,
        rating: Number(rating),
        title: String(title || '').trim(),
        content: String(content || '').trim(),
        images: Array.isArray(images) ? images : [],
        isVerifiedPurchase,
        isVisible: true,
    });

    return { status: 'OK', message: 'Đánh giá thành công', data: created };
};

const updateReview = async (id, userId, isAdmin, payload) => {
    if (!mongoose.isValidObjectId(id)) return { status: 'ERR', message: 'Review ID không hợp lệ' };
    const review = await Review.findById(id);
    if (!review) return { status: 'ERR', message: 'Đánh giá không tồn tại' };
    if (!isAdmin && String(review.userId) !== String(userId)) return { status: 'ERR', message: 'Không có quyền cập nhật đánh giá này' };

    const updateData = { ...payload };
    if (updateData.rating !== undefined) {
        if (!Number.isInteger(Number(updateData.rating)) || Number(updateData.rating) < 1 || Number(updateData.rating) > 5) {
            return { status: 'ERR', message: 'rating phải từ 1 đến 5' };
        }
        updateData.rating = Number(updateData.rating);
    }
    const updated = await Review.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    return { status: 'OK', message: 'Cập nhật đánh giá thành công', data: updated };
};

const deleteReview = async (id, userId, isAdmin) => {
    if (!mongoose.isValidObjectId(id)) return { status: 'ERR', message: 'Review ID không hợp lệ' };
    const review = await Review.findById(id);
    if (!review) return { status: 'ERR', message: 'Đánh giá không tồn tại' };
    if (!isAdmin && String(review.userId) !== String(userId)) return { status: 'ERR', message: 'Không có quyền xóa đánh giá này' };
    if (!review.isVisible) return { status: 'OK', message: 'Đánh giá đã được ẩn trước đó' };
    await Review.findByIdAndUpdate(id, { $set: { isVisible: false } }, { new: true, runValidators: true });
    return { status: 'OK', message: 'Ẩn đánh giá thành công' };
};

const getReviews = async (query = {}, currentUser = null, isAdmin = false) => {
    const filter = {};
    if (query.productId) {
        if (!mongoose.isValidObjectId(query.productId)) return { status: 'ERR', message: 'productId không hợp lệ' };
        filter.productId = query.productId;
    }
    if (query.userId && isAdmin && mongoose.isValidObjectId(query.userId)) filter.userId = query.userId;
    if (!isAdmin) filter.isVisible = true;
    const limit = Math.min(Math.max(parseInt(query.limit) || 20, 1), 100);
    const page = Math.max(parseInt(query.page) || 0, 0);
    const total = await Review.countDocuments(filter);
    const data = await Review.find(filter).populate('userId', 'name avatar').sort({ createdAt: -1 }).skip(page * limit).limit(limit).lean();
    const average = query.productId ? (await Review.aggregate([{ $match: { productId: new mongoose.Types.ObjectId(query.productId), isVisible: true } }, { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }])) : [];
    return { status: 'OK', message: 'Thành công', data, total, pageCurrent: page + 1, totalPage: Math.ceil(total / limit), summary: average[0] || { avg: 0, count: 0 } };
};

module.exports = {
    createReview,
    updateReview,
    deleteReview,
    getReviews,
};
