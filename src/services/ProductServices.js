const Product = require("../models/ProductModel");
const Type = require("../models/TypeModel");
const Review = require("../models/ReviewModel");
const mongoose = require("mongoose");
const { buildActiveOnlyFilter, isActiveRecord } = require("../utils/visibility");

const ALLOWED_FILTER_FIELDS = new Set(['name', 'brand', 'species', 'sku']);
const ALLOWED_SORT_FIELDS = new Set(['createdAt', 'name', 'price', 'countInStock', 'discount', 'selled']);
const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const validateProductNumbers = ({ price, countInStock, discount = 0 }) => {
    if (price !== undefined && (!Number.isFinite(Number(price)) || Number(price) < 0)) {
        return 'Giá sản phẩm không hợp lệ';
    }
    if (countInStock !== undefined && (!Number.isFinite(Number(countInStock)) || Number(countInStock) < 0)) {
        return 'Tồn kho không hợp lệ';
    }
    if (
        discount !== undefined &&
        (!Number.isFinite(Number(discount)) || Number(discount) < 0 || Number(discount) > 100)
    ) {
        return 'Giảm giá phải nằm trong khoảng 0-100';
    }
    return null;
};

const createProduct = async (newProduct) => {
    const { name, image, type, price, countInStock, description, discount } = newProduct || {};
    try {
        const normalizedName = name?.trim();
        const numberError = validateProductNumbers({ price, countInStock, discount });

        if (!normalizedName || price === undefined || countInStock === undefined || !type) {
            return {
                status: 'ERR',
                message: 'Thiếu thông tin bắt buộc: name, price, countInStock, type',
            };
        }
        if (numberError) {
            return {
                status: 'ERR',
                message: numberError,
            };
        }
        const checkProduct = await Product.findOne({ name: normalizedName });
        if (checkProduct !== null) {
            return {
                status: 'ERR',
                message: 'Tên sản phẩm đã tồn tại',
            };
        }
        if (!mongoose.isValidObjectId(type)) {
            return {
                status: 'ERR',
                message: 'Loại sản phẩm không hợp lệ',
            };
        }
        const checkType = await Type.findOne({ _id: type, isActive: true });
        if (!checkType) {
            return {
                status: 'ERR',
                message: 'Loại sản phẩm không tồn tại hoặc đã bị ẩn',
            };
        }
        const createdProduct = await Product.create({
            name: normalizedName,
            image,
            type,
            price: Number(price),
            countInStock: Number(countInStock),
            description,
            discount: Number(discount || 0),
        });
        return {
            status: 'OK',
            message: 'Thành công',
            data: createdProduct,
        };
    } catch (e) {
        throw e;
    }
};

const updateProduct = async (id, data) => {
    try {
        if (!mongoose.isValidObjectId(id)) {
            return {
                status: 'ERR',
                message: 'Product ID không hợp lệ',
            };
        }
        const checkProduct = await Product.findOne({ _id: id });
        if (!checkProduct) {
            return {
                status: 'ERR',
                message: 'Sản phẩm không tồn tại',
            };
        }
        const updateData = { ...data };
        const numberError = validateProductNumbers(updateData);
        if (numberError) {
            return {
                status: 'ERR',
                message: numberError,
            };
        }
        if (updateData.name) {
            updateData.name = updateData.name.trim();
            const nameCheck = await Product.findOne({ name: updateData.name, _id: { $ne: id } });
            if (nameCheck) {
                return {
                    status: 'ERR',
                    message: 'Tên sản phẩm đã tồn tại',
                };
            }
        }
        if (updateData.price !== undefined) updateData.price = Number(updateData.price);
        if (updateData.countInStock !== undefined) updateData.countInStock = Number(updateData.countInStock);
        if (updateData.discount !== undefined) updateData.discount = Number(updateData.discount);

        if (updateData.type) {
            if (!mongoose.isValidObjectId(updateData.type)) {
                return {
                    status: 'ERR',
                    message: 'Loại sản phẩm không hợp lệ',
                };
            }
            const checkType = await Type.findOne({ _id: updateData.type, isActive: true });
            if (!checkType) {
                return {
                    status: 'ERR',
                    message: 'Loại sản phẩm không tồn tại hoặc đã bị ẩn',
                };
            }
        }
        const updatedProduct = await Product.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        });
        return {
            status: 'OK',
            message: 'Thành công',
            data: updatedProduct,
        };
    } catch (e) {
        throw e;
    }
};

const deleteProduct = async (id) => {
    try {
        if (!mongoose.isValidObjectId(id)) {
            return {
                status: 'ERR',
                message: 'Product ID không hợp lệ',
            };
        }
        const checkProduct = await Product.findOne({ _id: id });
        if (!checkProduct) {
            return {
                status: 'ERR',
                message: 'Sản phẩm không tồn tại',
            };
        }
        if (!checkProduct.isActive) {
            return {
                status: 'OK',
                message: 'Sản phẩm đã được ẩn trước đó',
            };
        }
        await Product.findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true, runValidators: true });
        return {
            status: 'OK',
            message: 'Ẩn sản phẩm thành công',
        };
    } catch (e) {
        throw e;
    }
};

const normalizePairQuery = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',');
    return [];
};

const hydrateTypesForProducts = async (products) => {
    const typeIds = [
        ...new Set(
            products
                .map((product) => product?.type)
                .filter((typeId) => mongoose.isValidObjectId(typeId))
                .map((typeId) => typeId.toString())
        ),
    ];

    if (!typeIds.length) return products;

    const types = await Type.find({ _id: { $in: typeIds }, isActive: true }).lean();
    const typeMap = new Map(types.map((type) => [type._id.toString(), type]));

    return products.map((product) => {
        const typeId = product?.type?.toString?.() || product?.type;
        if (typeId && typeMap.has(typeId)) {
            return {
                ...product,
                type: typeMap.get(typeId),
            };
        }
        return product;
    });
};

const keepProductsWithActiveTypes = (products = []) =>
    products.filter((product) => Boolean(product?.type && typeof product.type === 'object' && product.type._id));

const getActiveTypeIds = async () =>
    Type.find({ isActive: true }).distinct('_id');

const attachReviewStatsForProducts = async (products = []) => {
    const productIds = [
        ...new Set(
            products
                .map((product) => product?._id)
                .filter((id) => mongoose.isValidObjectId(id))
                .map((id) => id.toString())
        ),
    ];
    if (!productIds.length) return products;

    const stats = await Review.aggregate([
        {
            $match: {
                productId: { $in: productIds.map((id) => new mongoose.Types.ObjectId(id)) },
                isVisible: true,
            },
        },
        {
            $group: {
                _id: "$productId",
                avgRating: { $avg: "$rating" },
                reviewCount: { $sum: 1 },
            },
        },
    ]);

    const statsMap = new Map(
        stats.map((item) => [
            String(item._id),
            {
                rating: Number((item.avgRating || 0).toFixed(1)),
                reviewCount: Number(item.reviewCount || 0),
            },
        ])
    );

    return products.map((product) => {
        const key = String(product?._id || "");
        const stat = statsMap.get(key) || { rating: 0, reviewCount: 0 };
        return {
            ...product,
            rating: stat.rating,
            reviewCount: stat.reviewCount,
        };
    });
};

const getAllProduct = async (queryParams = {}) => {
    try {
        const { limit, page, sort, filter, type, keyword } = queryParams;
        const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 1000);
        const parsedPage = Math.max(parseInt(page, 10) || 0, 0);
        const conditions = buildActiveOnlyFilter();
        const activeTypeIds = await getActiveTypeIds();
        conditions.type = { $in: activeTypeIds };

        if (keyword) {
            conditions.name = { $regex: escapeRegex(keyword), $options: 'i' };
        }

        if (type) {
            if (!mongoose.isValidObjectId(type)) {
                return {
                    status: 'OK',
                    message: 'Thành công',
                    data: [],
                    total: 0,
                    pageCurrent: 1,
                    totalPage: 0,
                };
            }
            conditions.type = { $in: [type].filter((id) => activeTypeIds.some((activeId) => String(activeId) === String(id))) };
        }

        const filterPair = normalizePairQuery(filter);
        if (filterPair.length >= 2) {
            const [field, value] = filterPair;
            if (field === 'type') {
                if (!mongoose.isValidObjectId(value)) {
                    return {
                        status: 'OK',
                        message: 'Thành công',
                        data: [],
                        total: 0,
                        pageCurrent: 1,
                        totalPage: 0,
                    };
                }
                conditions.type = { $in: activeTypeIds.filter((activeId) => String(activeId) === String(value)) };
            } else if (value && ALLOWED_FILTER_FIELDS.has(field)) {
                conditions[field] = { $regex: escapeRegex(value), $options: 'i' };
            }
        }

        const totalProduct = await Product.countDocuments(conditions);
        let query = Product.find(conditions).lean();

        const sortPair = normalizePairQuery(sort);
        if (sortPair.length >= 2) {
            const objectSort = {};
            const sortField = String(sortPair[1] || '');
            if (ALLOWED_SORT_FIELDS.has(sortField)) {
                objectSort[sortField] = String(sortPair[0]).toLowerCase() === 'asc' ? 1 : -1;
                query = query.sort(objectSort);
            } else {
                query = query.sort({ createdAt: -1 });
            }
        } else {
            query = query.sort({ createdAt: -1 });
        }

        const allProductRaw = await query.limit(parsedLimit).skip(parsedPage * parsedLimit);
        const hydratedTypes = await hydrateTypesForProducts(allProductRaw);
        const activeTypeProducts = keepProductsWithActiveTypes(hydratedTypes);
        const allProduct = await attachReviewStatsForProducts(activeTypeProducts);

        return {
            status: 'OK',
            message: 'Thành công',
            data: allProduct,
            total: totalProduct,
            pageCurrent: parsedPage + 1,
            totalPage: Math.ceil(totalProduct / parsedLimit),
        };
    } catch (e) {
        throw e;
    }
};

const getDetailsProduct = async (id) => {
    try {
        if (!mongoose.isValidObjectId(id)) {
            return {
                status: 'ERR',
                message: 'Product ID không hợp lệ',
            };
        }
        const product = await Product.findOne({ _id: id }).lean();
        if (!isActiveRecord(product)) {
            return {
                status: 'ERR',
                message: 'Sản phẩm không tồn tại',
            };
        }
        const [hydratedTypeProduct] = await hydrateTypesForProducts([product]);
        const activeTypeProduct = keepProductsWithActiveTypes([hydratedTypeProduct])[0];
        if (!activeTypeProduct) {
            return {
                status: 'ERR',
                message: 'Sản phẩm không tồn tại',
            };
        }
        const [hydratedProduct] = await attachReviewStatsForProducts([activeTypeProduct]);
        return {
            status: 'OK',
            message: 'Thành công',
            data: hydratedProduct,
        };
    } catch (e) {
        throw e;
    }
};

const searchProduct = async (keyword) => {
    try {
        const productsRaw = await Product.find({
            name: { $regex: escapeRegex(keyword), $options: 'i' },
            isActive: true,
            type: { $in: await getActiveTypeIds() },
        }).sort({ createdAt: -1 }).limit(50).lean();
        const hydratedTypes = await hydrateTypesForProducts(productsRaw);
        const activeTypeProducts = keepProductsWithActiveTypes(hydratedTypes);
        const products = await attachReviewStatsForProducts(activeTypeProducts);

        return {
            status: 'OK',
            message: 'Thành công',
            data: products,
        };
    } catch (e) {
        throw e;
    }
};
module.exports = {
    createProduct,
    updateProduct,
    getDetailsProduct,
    deleteProduct,
    getAllProduct,
    searchProduct,
};


