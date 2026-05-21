const mongoose = require('mongoose');
const Wishlist = require('../models/WishlistModel');
const Product = require('../models/ProductModel');

const getWishlistByUser = async (userId) => {
    const wishlist = await Wishlist.findOne({ userId }).populate({
        path: 'productIds',
        match: { isActive: true },
    });

    if (!wishlist) {
        return {
            status: 'OK',
            message: 'Thành công',
            data: { userId, productIds: [] },
        };
    }

    return {
        status: 'OK',
        message: 'Thành công',
        data: wishlist,
    };
};

const addProductToWishlist = async (userId, productId) => {
    if (!mongoose.isValidObjectId(productId)) {
        return { status: 'ERR', message: 'Product ID không hợp lệ' };
    }
    const product = await Product.findOne({ _id: productId, isActive: true });
    if (!product) return { status: 'ERR', message: 'Sản phẩm không tồn tại hoặc đã ngừng bán' };

    const wishlist = await Wishlist.findOneAndUpdate(
        { userId },
        { $addToSet: { productIds: productId } },
        { upsert: true, new: true }
    ).populate({
        path: 'productIds',
        match: { isActive: true },
    });

    return { status: 'OK', message: 'Đã thêm sản phẩm yêu thích', data: wishlist };
};

const removeProductFromWishlist = async (userId, productId) => {
    if (!mongoose.isValidObjectId(productId)) {
        return { status: 'ERR', message: 'Product ID không hợp lệ' };
    }

    const wishlist = await Wishlist.findOneAndUpdate(
        { userId },
        { $pull: { productIds: productId } },
        { new: true, upsert: true }
    ).populate({
        path: 'productIds',
        match: { isActive: true },
    });

    return { status: 'OK', message: 'Đã xóa sản phẩm khỏi yêu thích', data: wishlist };
};

const clearWishlist = async (userId) => {
    const wishlist = await Wishlist.findOneAndUpdate(
        { userId },
        { $set: { productIds: [] } },
        { new: true, upsert: true }
    );

    return { status: 'OK', message: 'Đã xóa danh sách yêu thích', data: wishlist };
};

module.exports = {
    getWishlistByUser,
    addProductToWishlist,
    removeProductFromWishlist,
    clearWishlist,
};
