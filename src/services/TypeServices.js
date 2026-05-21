const Type = require("../models/TypeModel");
const Product = require("../models/ProductModel");
const mongoose = require("mongoose");

const TYPE_DISPLAY_ORDER = [
    'Thức ăn chó',
    'Phụ kiện cho chó',
    'Vệ sinh chăm sóc chó',
    'Chuồng, nhà, balo, Quây, Đệm cho chó',
    'Thuốc Và Thực Phẩm Chức Năng cho chó',
    'Thức ăn mèo',
    'Phụ kiện cho mèo',
    'Vệ sinh chăm sóc mèo',
    'Chuồng, Chậu, Balo Và Túi Vận Chuyển cho mèo',
    'Thuốc Và Thực Phẩm Chức Năng cho mèo',
];

const sortTypesForDisplay = (types = []) => {
    const orderMap = new Map(TYPE_DISPLAY_ORDER.map((name, index) => [name, index]));
    return [...types].sort((a, b) => {
        const aOrder = orderMap.has(a.name) ? orderMap.get(a.name) : Number.MAX_SAFE_INTEGER;
        const bOrder = orderMap.has(b.name) ? orderMap.get(b.name) : Number.MAX_SAFE_INTEGER;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return (a.name || '').localeCompare(b.name || '', 'vi');
    });
};

const createType = (newType) => {
    return new Promise(async (resolve, reject) => {
        const { name } = newType;
        try {
            const normalizedName = name?.trim();
            if (!normalizedName) {
                return resolve({
                    status: 'ERR',
                    message: 'Tên loại sản phẩm là bắt buộc',
                });
            }
            const checkType = await Type.findOne({ name: normalizedName });
            if (checkType !== null) {
                return resolve({
                    status: 'ERR',
                    message: 'Tên loại sản phẩm đã tồn tại',
                });
            }
            const createdType = await Type.create({ name: normalizedName });
            return resolve({
                status: 'OK',
                message: 'Thành công',
                data: createdType,
            });
        } catch (e) {
            reject(e);
        }
    });
};

const getAllType = () => {
    return new Promise(async (resolve, reject) => {
        try {
            const allType = await Type.find();
            const sortedType = sortTypesForDisplay(allType);
            return resolve({
                status: 'OK',
                message: 'Thành công',
                data: sortedType,
            });
        } catch (e) {
            reject(e);
        }
    });
};

const updateType = (id, data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!id) {
                return resolve({
                    status: 'ERR',
                    message: 'Type ID bắt buộc',
                });
            }
            if (!mongoose.isValidObjectId(id)) {
                return resolve({
                    status: 'ERR',
                    message: 'Type ID không hợp lệ',
                });
            }
            const name = data?.name?.trim();
            if (!name) {
                return resolve({
                    status: 'ERR',
                    message: 'Tên loại sản phẩm là bắt buộc',
                });
            }
            const existedType = await Type.findOne({ name, _id: { $ne: id } });
            if (existedType) {
                return resolve({
                    status: 'ERR',
                    message: 'Tên loại sản phẩm đã tồn tại',
                });
            }
            const updatedType = await Type.findByIdAndUpdate(id, { name }, { new: true });
            if (!updatedType) {
                return resolve({
                    status: 'ERR',
                    message: 'Loại sản phẩm không tồn tại',
                });
            }
            return resolve({
                status: 'OK',
                message: 'Cập nhật thành công',
                data: updatedType,
            });
        } catch (e) {
            reject(e);
        }
    });
};

const deleteType = (id) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!id) {
                return resolve({
                    status: 'ERR',
                    message: 'Type ID bắt buộc',
                });
            }
            if (!mongoose.isValidObjectId(id)) {
                return resolve({
                    status: 'ERR',
                    message: 'Type ID không hợp lệ',
                });
            }
            const productCount = await Product.countDocuments({ type: id });
            if (productCount > 0) {
                return resolve({
                    status: 'ERR',
                    message: 'Không thể xóa loại đang có sản phẩm',
                });
            }
            const deletedType = await Type.findByIdAndDelete(id);
            if (!deletedType) {
                return resolve({
                    status: 'ERR',
                    message: 'Loại sản phẩm không tồn tại',
                });
            }
            return resolve({
                status: 'OK',
                message: 'Xóa thành công',
            });
        } catch (e) {
            reject(e);
        }
    });
};

module.exports = {
    createType,
    getAllType,
    updateType,
    deleteType,
};
