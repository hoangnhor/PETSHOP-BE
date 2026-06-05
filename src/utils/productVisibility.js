const Product = require('../models/ProductModel');

const populateVisibleType = {
    path: 'type',
    match: { isActive: true },
    select: '_id',
};

const loadVisibleProductById = async (productId) => {
    if (!productId) return null;
    const query = Product.findById(productId);
    if (!query) return null;

    if (typeof query.populate === 'function') {
        const product = await query.populate(populateVisibleType).lean();
        if (!product || !product.isActive || !product.type || !product.type._id) return null;
        return product;
    }

    const product = await query;
    if (!product || product.isActive === false) return null;
    if (product.type && typeof product.type === 'object' && !product.type._id) return null;
    return product;
};

const loadVisibleProductsByIds = async (productIds = []) => {
    if (!Array.isArray(productIds) || !productIds.length) return [];
    const products = await Product.find({ _id: { $in: productIds }, isActive: true })
        .populate(populateVisibleType)
        .lean();
    return products.filter((product) => Boolean(product?.type && product.type._id));
};

module.exports = {
    loadVisibleProductById,
    loadVisibleProductsByIds,
};
