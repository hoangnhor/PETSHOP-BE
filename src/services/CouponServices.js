const mongoose = require('mongoose');
const Coupon = require('../models/CouponModel');
const Bill = require('../models/BillModel');
const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const nowInRange = (coupon) => {
    const now = Date.now();
    if (coupon.startsAt && new Date(coupon.startsAt).getTime() > now) return false;
    if (coupon.endsAt && new Date(coupon.endsAt).getTime() < now) return false;
    return true;
};

const createCoupon = async (payload) => {
    const { code, name, discountType, discountValue } = payload;
    if (!code || !name || !discountType || discountValue === undefined) return { status: 'ERR', message: 'code, name, discountType, discountValue là bắt buộc' };
    const normalizedCode = String(code).trim().toUpperCase();
    const duplicated = await Coupon.findOne({ code: normalizedCode });
    if (duplicated) return { status: 'ERR', message: 'Mã giảm giá đã tồn tại' };
    const created = await Coupon.create({ ...payload, code: normalizedCode, name: String(name).trim(), discountValue: Number(discountValue) });
    return { status: 'OK', message: 'Tạo coupon thành công', data: created };
};

const updateCoupon = async (id, payload) => {
    if (!mongoose.isValidObjectId(id)) return { status: 'ERR', message: 'Coupon ID không hợp lệ' };
    const updateData = { ...payload };
    if (updateData.code) updateData.code = String(updateData.code).trim().toUpperCase();
    if (updateData.discountValue !== undefined) updateData.discountValue = Number(updateData.discountValue);
    if (updateData.code) {
        const duplicated = await Coupon.findOne({
            code: updateData.code,
            _id: { $ne: id },
        }).lean();
        if (duplicated) {
            return { status: 'ERR', message: 'Mã giảm giá đã tồn tại' };
        }
    }
    try {
        const updated = await Coupon.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
        if (!updated) return { status: 'ERR', message: 'Coupon không tồn tại' };
        return { status: 'OK', message: 'Cập nhật coupon thành công', data: updated };
    } catch (error) {
        if (error?.code === 11000) {
            return { status: 'ERR', message: 'Mã giảm giá đã tồn tại' };
        }
        throw error;
    }
};

const deleteCoupon = async (id) => {
    if (!mongoose.isValidObjectId(id)) return { status: 'ERR', message: 'Coupon ID không hợp lệ' };
    const coupon = await Coupon.findById(id);
    if (!coupon) return { status: 'ERR', message: 'Coupon không tồn tại' };
    if (!coupon.isActive) return { status: 'OK', message: 'Coupon đã được ẩn trước đó' };
    await Coupon.findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true, runValidators: true });
    return { status: 'OK', message: 'Ẩn coupon thành công' };
};

const getCouponDetail = async (id) => {
    if (!mongoose.isValidObjectId(id)) return { status: 'ERR', message: 'Coupon ID không hợp lệ' };
    const data = await Coupon.findById(id).lean();
    if (!data) return { status: 'ERR', message: 'Coupon không tồn tại' };
    return { status: 'OK', message: 'Thành công', data };
};

const getAllCoupons = async (query = {}) => {
    const filter = {};
    if (query.isActive !== undefined) filter.isActive = String(query.isActive) === 'true';
    if (query.keyword) {
        const keyword = escapeRegex(query.keyword);
        filter.$or = [{ code: { $regex: keyword, $options: 'i' } }, { name: { $regex: keyword, $options: 'i' } }];
    }
    const limit = Math.min(Math.max(parseInt(query.limit) || 50, 1), 200);
    const page = Math.max(parseInt(query.page) || 0, 0);
    const total = await Coupon.countDocuments(filter);
    const data = await Coupon.find(filter).sort({ createdAt: -1 }).skip(page * limit).limit(limit).lean();
    return { status: 'OK', message: 'Thành công', data, total, pageCurrent: page + 1, totalPage: Math.ceil(total / limit) };
};

const validateCouponCode = async (code, orderValue = 0, userId = null) => {
    const normalizedCode = String(code || '').trim().toUpperCase();
    if (!normalizedCode) return { status: 'ERR', message: 'Mã giảm giá là bắt buộc' };
    const coupon = await Coupon.findOne({ code: normalizedCode, isActive: true }).lean();
    if (!coupon) return { status: 'ERR', message: 'Mã giảm giá không tồn tại' };
    if (!nowInRange(coupon)) return { status: 'ERR', message: 'Mã giảm giá chưa đến thời gian hoặc đã hết hạn' };
    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) return { status: 'ERR', message: 'Mã giảm giá đã hết lượt sử dụng' };
    if (userId && mongoose.isValidObjectId(userId) && Number(coupon.perUserLimit || 0) > 0) {
        const usedByCurrentUser = await Bill.countDocuments({
            iduser: userId,
            'coupon.code': normalizedCode,
            isDeleted: { $ne: true },
        });
        if (usedByCurrentUser >= Number(coupon.perUserLimit)) {
            return {
                status: 'ERR',
                message: `Mỗi tài khoản chỉ được dùng mã này tối đa ${Number(coupon.perUserLimit)} lần`,
            };
        }
    }
    if (Number(orderValue || 0) < Number(coupon.minOrderValue || 0)) return { status: 'ERR', message: `Đơn hàng chưa đạt tối thiểu ${Number(coupon.minOrderValue || 0).toLocaleString('vi-VN')}đ` };
    let discountAmount = 0;
    if (coupon.discountType === 'percent') {
        discountAmount = (Number(orderValue || 0) * Number(coupon.discountValue || 0)) / 100;
        if (Number(coupon.maxDiscountValue || 0) > 0) discountAmount = Math.min(discountAmount, Number(coupon.maxDiscountValue));
    } else {
        discountAmount = Number(coupon.discountValue || 0);
    }
    discountAmount = Math.max(0, Math.round(discountAmount));
    return { status: 'OK', message: 'Áp mã thành công', data: { coupon, discountAmount } };
};

module.exports = {
    createCoupon,
    updateCoupon,
    deleteCoupon,
    getCouponDetail,
    getAllCoupons,
    validateCouponCode,
};
