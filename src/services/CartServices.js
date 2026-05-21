const mongoose = require('mongoose');
const Cart = require('../models/CartModel');
const Product = require('../models/ProductModel');

const normalizeItemInput = (item) => ({
    productId: item?.productId || item?.idsp,
    quantity: Number(item?.quantity || 0),
});

const buildCartItem = (product, quantity) => ({
    productId: product._id,
    sku: product.sku || '',
    name: product.name,
    image: product.image || product.thumb || '',
    price: Number(product.price || 0),
    discount: Number(product.discount || 0),
    quantity,
});

const getCartByUser = async (userId) => {
    const cart = await Cart.findOne({ userId }).lean();
    return {
        status: 'OK',
        message: 'Thành công',
        data: cart || { userId, items: [], couponCode: '', note: '' },
    };
};

const upsertCartItems = async (userId, payload) => {
    const incomingItems = Array.isArray(payload?.items) ? payload.items : [];
    const normalizedItems = incomingItems.map(normalizeItemInput);

    if (!normalizedItems.length) {
        const cart = await Cart.findOneAndUpdate(
            { userId },
            { $set: { items: [], couponCode: String(payload?.couponCode || '').trim().toUpperCase(), note: payload?.note || '' } },
            { upsert: true, new: true }
        ).lean();
        return { status: 'OK', message: 'Cập nhật giỏ hàng thành công', data: cart };
    }

    for (const item of normalizedItems) {
        if (!mongoose.isValidObjectId(item.productId) || !Number.isInteger(item.quantity) || item.quantity < 1) {
            return { status: 'ERR', message: 'Dữ liệu sản phẩm trong giỏ hàng không hợp lệ' };
        }
    }

    const uniqueProductIds = [...new Set(normalizedItems.map((item) => String(item.productId)))];
    const products = await Product.find({ _id: { $in: uniqueProductIds }, isActive: true }).lean();
    const productMap = new Map(products.map((product) => [String(product._id), product]));

    if (productMap.size !== uniqueProductIds.length) {
        return { status: 'ERR', message: 'Có sản phẩm không tồn tại hoặc đã ngừng bán' };
    }

    const items = [];
    for (const item of normalizedItems) {
        const product = productMap.get(String(item.productId));
        const stock = Number(product?.countInStock || 0);
        if (item.quantity > stock) {
            return { status: 'ERR', message: `Sản phẩm ${product.name} chỉ còn ${stock}` };
        }
        items.push(buildCartItem(product, item.quantity));
    }

    const cart = await Cart.findOneAndUpdate(
        { userId },
        {
            $set: {
                items,
                couponCode: String(payload?.couponCode || '').trim().toUpperCase(),
                note: payload?.note || '',
            },
        },
        { upsert: true, new: true }
    ).lean();

    return {
        status: 'OK',
        message: 'Cập nhật giỏ hàng thành công',
        data: cart,
    };
};

const addToCart = async (userId, payload) => {
    const { productId, quantity = 1 } = normalizeItemInput(payload);
    if (!mongoose.isValidObjectId(productId) || !Number.isInteger(quantity) || quantity < 1) {
        return { status: 'ERR', message: 'Dữ liệu thêm giỏ hàng không hợp lệ' };
    }

    const product = await Product.findById(productId).lean();
    if (!product || !product.isActive) {
        return { status: 'ERR', message: 'Sản phẩm không tồn tại hoặc đã ngừng bán' };
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
        const nextQty = Math.min(quantity, Number(product.countInStock || 0));
        if (nextQty < 1) return { status: 'ERR', message: `Sản phẩm ${product.name} đã hết hàng` };
        const created = await Cart.create({
            userId,
            items: [buildCartItem(product, nextQty)],
        });
        return { status: 'OK', message: 'Thêm vào giỏ hàng thành công', data: created };
    }

    const idx = cart.items.findIndex((item) => String(item.productId) === String(productId));
    const currentQty = idx >= 0 ? Number(cart.items[idx].quantity || 0) : 0;
    const nextQty = currentQty + quantity;
    const stock = Number(product.countInStock || 0);
    if (nextQty > stock) return { status: 'ERR', message: `Sản phẩm ${product.name} chỉ còn ${stock}` };

    if (idx >= 0) {
        cart.items[idx] = buildCartItem(product, nextQty);
    } else {
        cart.items.push(buildCartItem(product, quantity));
    }
    await cart.save();

    return { status: 'OK', message: 'Thêm vào giỏ hàng thành công', data: cart };
};

const removeCartItem = async (userId, productId) => {
    if (!mongoose.isValidObjectId(productId)) {
        return { status: 'ERR', message: 'Product ID không hợp lệ' };
    }
    const cart = await Cart.findOne({ userId });
    if (!cart) return { status: 'OK', message: 'Thành công', data: { userId, items: [] } };

    cart.items = cart.items.filter((item) => String(item.productId) !== String(productId));
    await cart.save();
    return { status: 'OK', message: 'Xóa sản phẩm khỏi giỏ hàng thành công', data: cart };
};

const clearCart = async (userId) => {
    const cart = await Cart.findOneAndUpdate(
        { userId },
        { $set: { items: [], couponCode: '', note: '' } },
        { upsert: true, new: true }
    ).lean();
    return { status: 'OK', message: 'Đã xóa toàn bộ giỏ hàng', data: cart };
};

module.exports = {
    getCartByUser,
    upsertCartItems,
    addToCart,
    removeCartItem,
    clearCart,
};
