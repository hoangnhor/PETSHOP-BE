const Product = require("../models/ProductModel");
const Type = require("../models/TypeModel");
const mongoose = require("mongoose");

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

const createProduct = (newProduct) => {
    return new Promise(async (resolve, reject) => {
        const { name, image, type, price, countInStock, description, discount } = newProduct;
        try {
            const normalizedName = name?.trim();
            const numberError = validateProductNumbers({ price, countInStock, discount });

            if (!normalizedName || price === undefined || countInStock === undefined || !type) {
                return resolve({
                    status: 'ERR',
                    message: 'Thiếu thông tin bắt buộc: name, price, countInStock, type',
                });
            }
            if (numberError) {
                return resolve({
                    status: 'ERR',
                    message: numberError,
                });
            }
            const checkProduct = await Product.findOne({ name: normalizedName });
            if (checkProduct !== null) {
                return resolve({
                    status: 'ERR',
                    message: 'Tên sản phẩm đã tồn tại',
                });
            }
            if (!mongoose.isValidObjectId(type)) {
                return resolve({
                    status: 'ERR',
                    message: 'Loại sản phẩm không hợp lệ',
                });
            }
            const checkType = await Type.findById(type);
            if (!checkType) {
                return resolve({
                    status: 'ERR',
                    message: 'Loại sản phẩm không tồn tại',
                });
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
            return resolve({
                status: 'OK',
                message: 'Thành công',
                data: createdProduct,
            });
        } catch (e) {
            reject(e);
        }
    });
};

const updateProduct = (id, data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!mongoose.isValidObjectId(id)) {
                return resolve({
                    status: 'ERR',
                    message: 'Product ID không hợp lệ',
                });
            }
            const checkProduct = await Product.findOne({ _id: id });
            if (!checkProduct) {
                return resolve({
                    status: 'ERR',
                    message: 'Sản phẩm không tồn tại',
                });
            }
            const updateData = { ...data };
            const numberError = validateProductNumbers(updateData);
            if (numberError) {
                return resolve({
                    status: 'ERR',
                    message: numberError,
                });
            }
            if (updateData.name) {
                updateData.name = updateData.name.trim();
                const nameCheck = await Product.findOne({ name: updateData.name, _id: { $ne: id } });
                if (nameCheck) {
                    return resolve({
                        status: 'ERR',
                        message: 'Tên sản phẩm đã tồn tại',
                    });
                }
            }
            if (updateData.price !== undefined) updateData.price = Number(updateData.price);
            if (updateData.countInStock !== undefined) updateData.countInStock = Number(updateData.countInStock);
            if (updateData.discount !== undefined) updateData.discount = Number(updateData.discount);

            if (updateData.type) {
                if (!mongoose.isValidObjectId(updateData.type)) {
                    return resolve({
                        status: 'ERR',
                        message: 'Loại sản phẩm không hợp lệ',
                    });
                }
                const checkType = await Type.findById(updateData.type);
                if (!checkType) {
                    return resolve({
                        status: 'ERR',
                        message: 'Loại sản phẩm không tồn tại',
                    });
                }
            }
            const updatedProduct = await Product.findByIdAndUpdate(id, updateData, { new: true });
            return resolve({
                status: 'OK',
                message: 'Thành công',
                data: updatedProduct,
            });
        } catch (e) {
            reject(e);
        }
    });
};

const deleteProduct = (id) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!mongoose.isValidObjectId(id)) {
                return resolve({
                    status: 'ERR',
                    message: 'Product ID không hợp lệ',
                });
            }
            const checkProduct = await Product.findOne({ _id: id });
            if (!checkProduct) {
                return resolve({
                    status: 'ERR',
                    message: 'Sản phẩm không tồn tại',
                });
            }
            await Product.findByIdAndDelete(id);
            return resolve({
                status: 'OK',
                message: 'Xóa thành công',
            });
        } catch (e) {
            reject(e);
        }
    });
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

    const types = await Type.find({ _id: { $in: typeIds } }).lean();
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

const getAllProduct = (queryParams = {}) => {
    return new Promise(async (resolve, reject) => {
        try {
            const { limit, page, sort, filter, type, keyword } = queryParams;
            const parsedLimit = Math.min(parseInt(limit) || 100, 1000);
            const parsedPage = parseInt(page) || 0;
            const conditions = {};

            if (keyword) {
                conditions.name = { $regex: keyword, $options: 'i' };
            }

            if (type) {
                if (!mongoose.isValidObjectId(type)) {
                    return resolve({
                        status: 'OK',
                        message: 'Thành công',
                        data: [],
                        total: 0,
                        pageCurrent: 1,
                        totalPage: 0,
                    });
                }
                conditions.type = type;
            }

            const filterPair = normalizePairQuery(filter);
            if (filterPair.length >= 2) {
                const [field, value] = filterPair;
                if (field === 'type') {
                    if (!mongoose.isValidObjectId(value)) {
                        return resolve({
                            status: 'OK',
                            message: 'Thành công',
                            data: [],
                            total: 0,
                            pageCurrent: 1,
                            totalPage: 0,
                        });
                    }
                    conditions.type = value;
                } else if (value) {
                    conditions[field] = { $regex: value, $options: 'i' };
                }
            }

            const totalProduct = await Product.countDocuments(conditions);
            let query = Product.find(conditions).lean();

            const sortPair = normalizePairQuery(sort);
            if (sortPair.length >= 2) {
                const objectSort = {};
                objectSort[sortPair[1]] = sortPair[0] === 'asc' ? 1 : -1;
                query = query.sort(objectSort);
            } else {
                query = query.sort({ createdAt: -1 });
            }

            const allProductRaw = await query
                .limit(parsedLimit)
                .skip(parsedPage * parsedLimit);
            const allProduct = await hydrateTypesForProducts(allProductRaw);

            return resolve({
                status: 'OK',
                message: 'Thành công',
                data: allProduct,
                total: totalProduct,
                pageCurrent: parsedPage + 1,
                totalPage: Math.ceil(totalProduct / parsedLimit),
            });
        } catch (e) {
            reject(e);
        }
    });
};

const getDetailsProduct = (id) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!mongoose.isValidObjectId(id)) {
                return resolve({
                    status: 'ERR',
                    message: 'Product ID không hợp lệ',
                });
            }
            const product = await Product.findOne({ _id: id }).lean();
            if (!product) {
                return resolve({
                    status: 'ERR',
                    message: 'Sản phẩm không tồn tại',
                });
            }
            const [hydratedProduct] = await hydrateTypesForProducts([product]);
            return resolve({
                status: 'OK',
                message: 'Thành công',
                data: hydratedProduct,
            });
        } catch (e) {
            reject(e);
        }
    });
};
const searchProduct = (keyword) => {
    return new Promise(async (resolve, reject) => {
        try {
            const productsRaw = await Product.find({
                name: { $regex: keyword, $options: 'i' },
            }).sort({ createdAt: -1 }).limit(50).lean();
            const products = await hydrateTypesForProducts(productsRaw);

            return resolve({
                status: 'OK',
                message: 'Thành công',
                data: products,
            });
        } catch (e) {
            reject({
                status: 'ERR',
                message: e.message || 'Lỗi không xác định trong searchProduct',
                stack: e.stack,
            });
        }
    });
};
module.exports = {
    createProduct,
    updateProduct,
    getDetailsProduct,
    deleteProduct,
    getAllProduct,
    searchProduct,
};


