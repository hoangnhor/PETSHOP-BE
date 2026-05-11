const User = require("../models/UserModel");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const { genneralAccessToken, genneralRefreshToken } = require("./JwtServices");

// Tạo API đăng ký
const createUser = (newUser, allowAdmin = false) => {
    return new Promise(async (resolve, reject) => {
        const { name, email, password, phone, isAdmin } = newUser;
        try {
            const normalizedEmail = email?.trim().toLowerCase();
            if (!name || !normalizedEmail || !password) {
                return resolve({
                    status: 'ERR',
                    message: 'Thiếu thông tin bắt buộc: name, email, password',
                });
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
                return resolve({
                    status: 'ERR',
                    message: 'Email không hợp lệ',
                });
            }
            const checkUser = await User.findOne({ email: normalizedEmail });
            if (checkUser !== null) {
                return resolve({
                    status: 'ERR',
                    message: 'Email đã tồn tại',
                });
            }
            const hash = bcrypt.hashSync(password, 10);
            const createdUser = await User.create({
                name: name.trim(),
                email: normalizedEmail,
                password: hash,
                phone,
                isAdmin: allowAdmin ? Boolean(isAdmin) : false,
            });
            const userData = createdUser.toObject();
            delete userData.password;
            return resolve({
                status: 'OK',
                message: 'Thành công',
                data: userData,
            });
        } catch (e) {
            reject(e);
        }
    });
};

// Tạo API đăng nhập
const loginUser = (userLogin) => {
    return new Promise(async (resolve, reject) => {
        const { email, password } = userLogin;
        try {
            const normalizedEmail = email?.trim().toLowerCase();
            if (!normalizedEmail || !password) {
                return resolve({
                    status: 'ERR',
                    message: 'Email và password là bắt buộc',
                });
            }
            const checkUser = await User.findOne({ email: normalizedEmail }).select('+password');
            if (!checkUser) {
                return resolve({
                    status: 'ERR',
                    message: 'Người dùng không tồn tại',
                });
            }
            const comparePassword = bcrypt.compareSync(password, checkUser.password);
            if (!comparePassword) {
                return resolve({
                    status: 'ERR',
                    message: 'Mật khẩu không chính xác',
                });
            }
            const access_token = await genneralAccessToken({
                id: checkUser._id,
                email: checkUser.email,
                isAdmin: checkUser.isAdmin,
            });
            const refresh_token = await genneralRefreshToken({
                id: checkUser._id,
                email: checkUser.email,
                isAdmin: checkUser.isAdmin,
            });
            return resolve({
                status: 'OK',
                message: 'Thành công',
                access_token,
                refresh_token,
                isAdmin: checkUser.isAdmin,
            });
        } catch (e) {
            reject(e);
        }
    });
};

// Tạo API cập nhật
const updateUser = (id, data, isAdmin = false) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!mongoose.isValidObjectId(id)) {
                return resolve({
                    status: 'ERR',
                    message: 'User ID không hợp lệ',
                });
            }
            const checkUser = await User.findOne({ _id: id });
            if (!checkUser) {
                return resolve({
                    status: 'ERR',
                    message: 'Người dùng không tồn tại',
                });
            }
            const updateData = { ...data };
            delete updateData.confirmPassword;
            if (!isAdmin) delete updateData.isAdmin;

            if (updateData.email) {
                updateData.email = updateData.email.trim().toLowerCase();
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updateData.email)) {
                    return resolve({
                        status: 'ERR',
                        message: 'Email không hợp lệ',
                    });
                }
                const emailCheck = await User.findOne({ email: updateData.email, _id: { $ne: id } });
                if (emailCheck) {
                    return resolve({
                        status: 'ERR',
                        message: 'Email đã tồn tại',
                    });
                }
            }
            if (updateData.password) {
                updateData.password = bcrypt.hashSync(updateData.password, 10);
            }
            const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true });
            return resolve({
                status: 'OK',
                message: 'Thành công',
                data: updatedUser,
            });
        } catch (e) {
            reject(e);
        }
    });
};

// Xóa thông tin người dùng
const deleteUser = (id, currentUserId) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!mongoose.isValidObjectId(id)) {
                return resolve({
                    status: 'ERR',
                    message: 'User ID không hợp lệ',
                });
            }
            if (currentUserId && id === currentUserId) {
                return resolve({
                    status: 'ERR',
                    message: 'Không thể xóa tài khoản đang đăng nhập',
                });
            }
            const checkUser = await User.findOne({ _id: id });
            if (!checkUser) {
                return resolve({
                    status: 'ERR',
                    message: 'Người dùng không tồn tại',
                });
            }
            await User.findByIdAndDelete(id);
            return resolve({
                status: 'OK',
                message: 'Xóa thành công',
            });
        } catch (e) {
            reject(e);
        }
    });
};

// Lấy tất cả người dùng
const getAllUser = () => {
    return new Promise(async (resolve, reject) => {
        try {
            const allUser = await User.find().sort({ createdAt: -1 });
            return resolve({
                status: 'OK',
                message: 'Thành công',
                data: allUser,
            });
        } catch (e) {
            reject(e);
        }
    });
};

// Lấy chi tiết người dùng
const getDetailsUser = (id) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!mongoose.isValidObjectId(id)) {
                return resolve({
                    status: 'ERR',
                    message: 'User ID không hợp lệ',
                });
            }
            const user = await User.findOne({ _id: id });
            if (!user) {
                return resolve({
                    status: 'ERR',
                    message: 'Người dùng không tồn tại',
                });
            }
            return resolve({
                status: 'OK',
                message: 'Thành công',
                data: user,
            });
        } catch (e) {
            reject(e);
        }
    });
};

module.exports = {
    createUser,
    loginUser,
    updateUser,
    deleteUser,
    getAllUser,
    getDetailsUser,
};
