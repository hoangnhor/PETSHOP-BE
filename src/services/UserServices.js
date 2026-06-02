const User = require("../models/UserModel");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const {
    genneralAccessToken,
    genneralRefreshToken,
    saveRefreshTokenForUser,
} = require("./JwtServices");
const INVALID_LOGIN_MESSAGE = "Email hoặc mật khẩu không chính xác";
const SOFT_DELETED_USER_FILTER = { isDeleted: { $ne: true } };

const BASE_USER_UPDATE_FIELDS = new Set([
    "name",
    "email",
    "password",
    "phone",
    "address",
    "avatar",
    "addresses",
]);

const ADMIN_ONLY_USER_UPDATE_FIELDS = new Set([
    "isAdmin",
    "status",
]);

const pickAllowedUserUpdates = (source = {}, isAdmin = false) => {
    const allowed = new Set(BASE_USER_UPDATE_FIELDS);
    if (isAdmin) {
        for (const field of ADMIN_ONLY_USER_UPDATE_FIELDS) allowed.add(field);
    }

    return Object.entries(source).reduce((acc, [key, value]) => {
        if (allowed.has(key)) acc[key] = value;
        return acc;
    }, {});
};

// Tạo API đăng ký
const createUser = async (newUser, allowAdmin = false) => {
    const { name, email, password, phone, isAdmin } = newUser || {};
    try {
        const normalizedEmail = email?.trim().toLowerCase();
        if (!name || !normalizedEmail || !password) {
            return {
                status: "ERR",
                message: "Thiếu thông tin bắt buộc: name, email, password",
            };
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            return {
                status: "ERR",
                message: "Email không hợp lệ",
            };
        }
        const checkUser = await User.findOne({ email: normalizedEmail });
        if (checkUser !== null) {
            return {
                status: "ERR",
                message: "Email đã tồn tại",
            };
        }
        const hash = await bcrypt.hash(password, 10);
        const createdUser = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hash,
            phone: typeof phone === "string" ? phone.trim() : phone,
            isAdmin: allowAdmin ? Boolean(isAdmin) : false,
        });
        const userData = createdUser.toObject();
        delete userData.password;
        return {
            status: "OK",
            message: "Thành công",
            data: userData,
        };
    } catch (e) {
        if (e?.code === 11000) {
            return {
                status: "ERR",
                message: "Email đã tồn tại",
            };
        }
        throw e;
    }
};

// Tạo API đăng nhập
const loginUser = async (userLogin) => {
    const { email, password } = userLogin || {};
    try {
        const normalizedEmail = email?.trim().toLowerCase();
        if (!normalizedEmail || !password) {
            return {
                status: "ERR",
                message: "Email và password là bắt buộc",
            };
        }
        const checkUser = await User.findOne({ email: normalizedEmail }).select("+password");
        if (!checkUser) {
            return {
                status: "ERR",
                message: INVALID_LOGIN_MESSAGE,
            };
        }
        if (checkUser.status === "blocked" || checkUser.isDeleted) {
            return {
                status: "ERR",
                message: "Tài khoản đã bị khóa",
            };
        }
        const comparePassword = await bcrypt.compare(password, checkUser.password);
        if (!comparePassword) {
            return {
                status: "ERR",
                message: INVALID_LOGIN_MESSAGE,
            };
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
        await Promise.all([
            User.updateOne({ _id: checkUser._id }, { $set: { lastLoginAt: new Date() } }),
            saveRefreshTokenForUser(checkUser._id, refresh_token),
        ]);
        return {
            status: "OK",
            message: "Thành công",
            access_token,
            refresh_token,
            isAdmin: checkUser.isAdmin,
        };
    } catch (e) {
        throw e;
    }
};

// Tạo API cập nhật
const updateUser = async (id, data, isAdmin = false) => {
    try {
        if (!mongoose.isValidObjectId(id)) {
            return {
                status: "ERR",
                message: "User ID không hợp lệ",
            };
        }
        const checkUser = await User.findOne({ _id: id, ...SOFT_DELETED_USER_FILTER });
        if (!checkUser) {
            return {
                status: "ERR",
                message: "Người dùng không tồn tại",
            };
        }
        const updateData = pickAllowedUserUpdates(data, isAdmin);
        delete updateData.confirmPassword;

        if (updateData.email) {
            updateData.email = updateData.email.trim().toLowerCase();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updateData.email)) {
                return {
                    status: "ERR",
                    message: "Email không hợp lệ",
                };
            }
            const emailCheck = await User.findOne({ email: updateData.email, _id: { $ne: id }, ...SOFT_DELETED_USER_FILTER });
            if (emailCheck) {
                return {
                    status: "ERR",
                    message: "Email đã tồn tại",
                };
            }
        }
        if (updateData.password) {
            updateData.password = await bcrypt.hash(updateData.password, 10);
        }
        const updatedUser = await User.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        });
        return {
            status: "OK",
            message: "Thành công",
            data: updatedUser,
        };
    } catch (e) {
        if (e?.code === 11000) {
            return {
                status: "ERR",
                message: "Email đã tồn tại",
            };
        }
        throw e;
    }
};

// Xóa thông tin người dùng
const deleteUser = async (id, currentUserId) => {
    try {
        if (!mongoose.isValidObjectId(id)) {
            return {
                status: "ERR",
                message: "User ID không hợp lệ",
            };
        }
        if (currentUserId && String(id) === String(currentUserId)) {
            return {
                status: "ERR",
                message: "Không thể xóa tài khoản đang đăng nhập",
            };
        }
        const checkUser = await User.findOne({ _id: id });
        if (!checkUser) {
            return {
                status: "ERR",
                message: "Người dùng không tồn tại",
            };
        }
        if (checkUser.isDeleted) {
            return {
                status: "OK",
                message: "Tài khoản đã được xóa trước đó",
            };
        }
        await User.updateOne(
            { _id: id, isDeleted: { $ne: true } },
            {
                $set: {
                    status: "blocked",
                    isDeleted: true,
                    deletedAt: new Date(),
                    deletedBy: currentUserId || null,
                    refreshTokenHash: "",
                    refreshTokenExpiresAt: null,
                    previousRefreshTokenHash: "",
                    previousRefreshTokenGraceUntil: null,
                },
            }
        );
        return {
            status: "OK",
            message: "Xóa thành công",
        };
    } catch (e) {
        throw e;
    }
};

// Lấy tất cả người dùng
const getAllUser = async (query = {}) => {
    try {
        const limit = Math.min(Math.max(parseInt(query.limit, 10) || 50, 1), 200);
        const page = Math.max(parseInt(query.page, 10) || 0, 0);
        const filter = String(query.includeDeleted) === "true" ? {} : SOFT_DELETED_USER_FILTER;
        const total = await User.countDocuments(filter);
        const allUser = await User.find(filter)
            .sort({ createdAt: -1 })
            .skip(page * limit)
            .limit(limit)
            .lean();

        return {
            status: "OK",
            message: "Thành công",
            data: allUser,
            total,
            pageCurrent: page + 1,
            totalPage: Math.ceil(total / limit),
        };
    } catch (e) {
        throw e;
    }
};

// Lấy chi tiết người dùng
const getDetailsUser = async (id) => {
    try {
        if (!mongoose.isValidObjectId(id)) {
            return {
                status: "ERR",
                message: "User ID không hợp lệ",
            };
        }
        const user = await User.findOne({ _id: id, ...SOFT_DELETED_USER_FILTER });
        if (!user) {
            return {
                status: "ERR",
                message: "Người dùng không tồn tại",
            };
        }
        return {
            status: "OK",
            message: "Thành công",
            data: user,
        };
    } catch (e) {
        throw e;
    }
};

module.exports = {
    createUser,
    loginUser,
    updateUser,
    deleteUser,
    getAllUser,
    getDetailsUser,
};
