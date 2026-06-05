const mongoose = require('mongoose');
const Wishlist = require('../models/WishlistModel');
const { loadVisibleProductById, loadVisibleProductsByIds } = require('../utils/productVisibility');

const getWishlistByUser = async (userId) => {
    const wishlist = await Wishlist.findOne({ userId }).lean();

    if (!wishlist) {
        return {
            status: 'OK',
            message: 'Thành công',
            data: { userId, productIds: [] },
        };
    }

    const visibleProducts = await loadVisibleProductsByIds(wishlist.productIds || []);
    const visibleProductIds = visibleProducts.map((product) => product._id);
    if (visibleProductIds.length !== (wishlist.productIds || []).length) {
        await Wishlist.updateOne({ _id: wishlist._id }, { $set: { productIds: visibleProductIds } });
    }

    return {
        status: 'OK',
        message: 'Thành công',
        data: {
            ...wishlist,
            productIds: visibleProducts,
        },
    };
};

const addProductToWishlist = async (userId, productId) => {
    if (!mongoose.isValidObjectId(productId)) {
        return { status: 'ERR', message: 'Product ID không hợp lệ' };
    }
    const product = await loadVisibleProductById(productId);
    if (!product) return { status: 'ERR', message: 'Sản phẩm không tồn tại hoặc đã ngừng bán' };

    const wishlist = await Wishlist.findOneAndUpdate(
        { userId },
        { $addToSet: { productIds: productId } },
        { upsert: true, new: true }
    ).lean();

    const visibleProducts = await loadVisibleProductsByIds(wishlist.productIds || []);

    return {
        status: 'OK',
        message: 'Đã thêm sản phẩm yêu thích',
        data: {
            ...wishlist,
            productIds: visibleProducts,
        },
    };
};

const removeProductFromWishlist = async (userId, productId) => {
    if (!mongoose.isValidObjectId(productId)) {
        return { status: 'ERR', message: 'Product ID không hợp lệ' };
    }

    const wishlist = await Wishlist.findOneAndUpdate(
        { userId },
        { $pull: { productIds: productId } },
        { new: true, upsert: true }
    ).lean();

    const visibleProducts = await loadVisibleProductsByIds(wishlist.productIds || []);

    return {
        status: 'OK',
        message: 'Đã xóa sản phẩm khỏi yêu thích',
        data: {
            ...wishlist,
            productIds: visibleProducts,
        },
    };
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
