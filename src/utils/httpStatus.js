const getResponseStatusCode = (response = {}, successStatusCode = 200) => {
    if (response?.status === "OK") return successStatusCode;

    const rawCode = String(response?.code || "").trim().toUpperCase();
    if (rawCode === "UNAUTHORIZED") return 401;
    if (rawCode === "FORBIDDEN") return 403;
    if (rawCode === "NOT_FOUND") return 404;
    if (rawCode === "CONFLICT") return 409;
    if (rawCode === "INVALID_PAYLOAD") return 422;
    if (rawCode === "RATE_LIMITED") return 429;

    const message = String(response?.message || "").toLowerCase();
    if (!message) return 400;

    if (
        message.includes("token") ||
        message.includes("xác thực") ||
        message.includes("đăng nhập") ||
        message.includes("hết hạn phiên")
    ) {
        return 401;
    }
    if (
        message.includes("không có quyền") ||
        message.includes("chỉ admin") ||
        message.includes("không được phép truy cập")
    ) {
        return 403;
    }
    if (
        message.includes("không tồn tại") ||
        message.includes("không tìm thấy")
    ) {
        return 404;
    }
    if (message.includes("đã tồn tại") || message.includes("trùng")) {
        return 409;
    }
    if (
        message.includes("không hợp lệ") ||
        message.includes("bắt buộc") ||
        message.includes("thiếu thông tin")
    ) {
        return 422;
    }
    if (message.includes("quá nhiều")) {
        return 429;
    }

    return 400;
};

module.exports = {
    getResponseStatusCode,
};
