const Type = require("../models/TypeModel");
const Product = require("../models/ProductModel");
const mongoose = require("mongoose");

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
            return resolve({
                status: 'OK',
                message: 'Thành công',
                data: allType,
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
