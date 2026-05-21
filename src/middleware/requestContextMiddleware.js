const crypto = require('crypto');

const generateRequestId = () => {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const requestContext = (req, res, next) => {
    const requestId = req.headers['x-request-id'] || generateRequestId();
    req.requestId = String(requestId);
    res.setHeader('x-request-id', req.requestId);
    const start = Date.now();

    res.on('finish', () => {
        const durationMs = Date.now() - start;
        const log = {
            level: res.statusCode >= 500 ? 'error' : 'info',
            requestId: req.requestId,
            method: req.method,
            path: req.originalUrl,
            status: res.statusCode,
            durationMs,
            userId: req.userId || null,
            ip: req.ip || null,
            timestamp: new Date().toISOString(),
        };
        console.log(JSON.stringify(log));
    });

    next();
};

module.exports = {
    requestContext,
};
