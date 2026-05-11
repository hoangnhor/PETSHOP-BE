const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 180;
const ipRequestMap = new Map();

const getClientIp = (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length) {
        return forwarded.split(',')[0].trim();
    }
    return req.ip || req.connection?.remoteAddress || 'unknown';
};

const basicRateLimit = (req, res, next) => {
    const now = Date.now();
    const ip = getClientIp(req);
    const current = ipRequestMap.get(ip);

    if (!current || now - current.windowStart > WINDOW_MS) {
        ipRequestMap.set(ip, { windowStart: now, count: 1 });
        return next();
    }

    current.count += 1;
    if (current.count > MAX_REQUESTS_PER_WINDOW) {
        return res.status(429).json({
            status: 'ERR',
            message: 'Quá nhiều yêu cầu, vui lòng thử lại sau',
        });
    }

    return next();
};

const hasUnsafeKey = (value) => {
    if (!value || typeof value !== 'object') return false;
    if (Array.isArray(value)) return value.some(hasUnsafeKey);

    return Object.keys(value).some((key) => {
        if (key.includes('$') || key.includes('.')) return true;
        return hasUnsafeKey(value[key]);
    });
};

const sanitizePayload = (req, res, next) => {
    const payloads = [req.body, req.query, req.params];
    if (payloads.some(hasUnsafeKey)) {
        return res.status(400).json({
            status: 'ERR',
            message: 'Payload không hợp lệ',
        });
    }
    return next();
};

module.exports = {
    basicRateLimit,
    sanitizePayload,
};
