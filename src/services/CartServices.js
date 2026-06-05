const mongoose = require('mongoose');
const Cart = require('../models/CartModel');
const { loadVisibleProductById, loadVisibleProductsByIds } = require('../utils/productVisibility');

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
    if (!cart) {
        return {
            status: 'OK',
            message: 'Thành công',
            data: { userId, items: [], couponCode: '', note: '' },
        };
    }

    const productIds = (cart.items || []).map((item) => item.productId).filter(Boolean);
    const visibleProducts = await loadVisibleProductsByIds(productIds);
    const visibleProductMap = new Map(visibleProducts.map((product) => [String(product._id), product]));
    const nextItems = (cart.items || [])
        .map((item) => {
            const product = visibleProductMap.get(String(item.productId));
            if (!product) return null;
            return buildCartItem(product, Number(item.quantity || 0));
        })
        .filter(Boolean);

    if (nextItems.length !== (cart.items || []).length) {
        await Cart.updateOne({ _id: cart._id }, { $set: { items: nextItems } });
    }

    return {
        status: 'OK',
        message: 'Thành công',
        data: {
            ...cart,
            items: nextItems,
        },
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
            return { status: 'ERR', code: 'INVALID_PAYLOAD', message: 'Dữ liệu sản phẩm trong giỏ hàng không hợp lệ' };
        }
    }

    const mergedQuantityByProductId = new Map();
    for (const item of normalizedItems) {
        const key = String(item.productId);
        const currentQty = Number(mergedQuantityByProductId.get(key) || 0);
        mergedQuantityByProductId.set(key, currentQty + Number(item.quantity || 0));
    }

    const uniqueProductIds = [...mergedQuantityByProductId.keys()];
    const products = await loadVisibleProductsByIds(uniqueProductIds);
    const productMap = new Map(products.map((product) => [String(product._id), product]));

    if (productMap.size !== uniqueProductIds.length) {
        return { status: 'ERR', code: 'NOT_FOUND', message: 'Có sản phẩm không tồn tại hoặc đã ngừng bán' };
    }

    const items = [];
    for (const [productId, quantity] of mergedQuantityByProductId.entries()) {
        const product = productMap.get(String(productId));
        const stock = Number(product?.countInStock || 0);
        if (quantity > stock) {
            return { status: 'ERR', code: 'CONFLICT', message: `Sản phẩm ${product.name} chỉ còn ${stock}` };
        }
        items.push(buildCartItem(product, quantity));
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
        return { status: 'ERR', code: 'INVALID_PAYLOAD', message: 'Dữ liệu thêm giỏ hàng không hợp lệ' };
    }

    const product = await loadVisibleProductById(productId);
    if (!product) {
        return { status: 'ERR', code: 'NOT_FOUND', message: 'Sản phẩm không tồn tại hoặc đã ngừng bán' };
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
        const nextQty = Math.min(quantity, Number(product.countInStock || 0));
        if (nextQty < 1) return { status: 'ERR', code: 'CONFLICT', message: `Sản phẩm ${product.name} đã hết hàng` };
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
    if (nextQty > stock) return { status: 'ERR', code: 'CONFLICT', message: `Sản phẩm ${product.name} chỉ còn ${stock}` };

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
        return { status: 'ERR', code: 'INVALID_PAYLOAD', message: 'Product ID không hợp lệ' };
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
