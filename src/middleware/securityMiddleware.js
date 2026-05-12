const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60 * 1000);
const MAX_REQUESTS_PER_WINDOW = Number(process.env.RATE_LIMIT_MAX || 180);
const ipRequestMap = new Map();

const getClientIp = (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length) {
        return forwarded.split(',')[0].trim();
    }
    return req.ip || req.connection?.remoteAddress || 'unknown';
};

const compactRateLimitMap = (now) => {
    if (ipRequestMap.size <= 10000) return;
    for (const [key, entry] of ipRequestMap.entries()) {
        if (!entry || now - entry.windowStart > WINDOW_MS * 2) {
            ipRequestMap.delete(key);
        }
    }
};

const basicRateLimit = (req, res, next) => {
    const now = Date.now();
    const ip = getClientIp(req);
    const current = ipRequestMap.get(ip);

    compactRateLimitMap(now);

    if (!current || now - current.windowStart > WINDOW_MS) {
        ipRequestMap.set(ip, { windowStart: now, count: 1 });
        return next();
    }

    current.count += 1;
    if (current.count > MAX_REQUESTS_PER_WINDOW) {
        return res.status(429).json({
            status: 'ERR',
            code: 'RATE_LIMITED',
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
            code: 'INVALID_PAYLOAD',
            message: 'Payload không hợp lệ',
        });
    }
    return next();
};

module.exports = {
    basicRateLimit,
    sanitizePayload,
};
