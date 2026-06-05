const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const makeBadRequest = (message, extra = {}) => ({
    status: 400,
    body: {
        status: 'ERR',
        message,
        ...extra,
    },
});

const hasValue = (value) => value !== undefined && value !== null && String(value).trim() !== '';

const requireFields = (payload = {}, fields = [], message = 'Đầu vào bắt buộc') => {
    if (fields.some((field) => !hasValue(payload?.[field]))) {
        return makeBadRequest(message);
    }
    return null;
};

const requireParam = (value, label) => {
    if (!hasValue(value)) {
        return makeBadRequest(`${label} bắt buộc`);
    }
    return null;
};

const requireEmail = (email) => {
    if (!hasValue(email)) return makeBadRequest('Đầu vào bắt buộc');
    if (!EMAIL_REGEX.test(String(email))) return makeBadRequest('Email không hợp lệ');
    return null;
};

module.exports = {
    makeBadRequest,
    requireFields,
    requireParam,
    requireEmail,
};
