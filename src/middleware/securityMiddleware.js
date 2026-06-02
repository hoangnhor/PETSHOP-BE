const mongoose = require('mongoose');
const RateLimitCounter = require('../models/RateLimitCounterModel');
const { env, parsePositiveInteger } = require('../config/env');

const WINDOW_MS = env.rateLimitWindowMs;
const MAX_REQUESTS_PER_WINDOW = env.rateLimitMax;
const MAX_TRACKED_IPS = 10000;
const RATE_LIMIT_FALLBACK_LOG_COOLDOWN_MS = 60 * 1000;
const basicMemoryMap = new Map();
const scopedRateLimitMaps = new Map();
const rateLimitFallbackLogByScope = new Map();

const getClientIp = (req) => {
    const rawIp = req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown';
    return typeof rawIp === 'string' && rawIp.startsWith('::ffff:') ? rawIp.slice(7) : rawIp;
};

const setRateLimitHeaders = (res, { max, remaining, windowStartMs, windowMs }) => {
    res.setHeader('x-ratelimit-limit', String(max));
    res.setHeader('x-ratelimit-remaining', String(Math.max(remaining, 0)));
    res.setHeader('x-ratelimit-reset', String(Math.ceil((windowStartMs + windowMs) / 1000)));
};

const compactRateLimitMap = (map, now, windowMs) => {
    if (map.size <= MAX_TRACKED_IPS) return;
    for (const [key, entry] of map.entries()) {
        if (!entry || now - entry.windowStartMs > windowMs * 2) {
            map.delete(key);
        }
    }
};

const consumeMemoryCounter = ({ map, ip, windowMs, now }) => {
    compactRateLimitMap(map, now, windowMs);
    const windowStartMs = Math.floor(now / windowMs) * windowMs;
    const cacheKey = `${ip}:${windowStartMs}`;
    const currentCount = map.get(cacheKey) || 0;
    const nextCount = currentCount + 1;
    map.set(cacheKey, nextCount);
    return {
        count: nextCount,
        windowStartMs,
    };
};

const shouldUseMongoRateLimit = () =>
    env.rateLimitStore === 'mongo' && mongoose.connection?.readyState === 1;

const logRateLimitFallback = (scope, error) => {
    const now = Date.now();
    const lastLoggedAt = rateLimitFallbackLogByScope.get(scope) || 0;
    if (now - lastLoggedAt < RATE_LIMIT_FALLBACK_LOG_COOLDOWN_MS) return;
    rateLimitFallbackLogByScope.set(scope, now);
    console.error(JSON.stringify({
        level: 'error',
        code: 'RATE_LIMIT_FALLBACK_MEMORY',
        scope,
        message: error?.message || 'Mongo rate-limit store unavailable, switched to memory store',
        timestamp: new Date(now).toISOString(),
    }));
};

const consumeMongoCounter = async ({ scope, ip, windowMs, now }) => {
    const windowStartMs = Math.floor(now / windowMs) * windowMs;
    const windowStart = new Date(windowStartMs);
    const expiresAt = new Date(windowStartMs + windowMs * 2);
    let lastError;

    for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
            const counter = await RateLimitCounter.findOneAndUpdate(
                { scope, ip, windowStart },
                {
                    $setOnInsert: { scope, ip, windowStart, expiresAt },
                    $inc: { count: 1 },
                    $max: { expiresAt },
                },
                {
                    upsert: true,
                    new: true,
                    setDefaultsOnInsert: true,
                }
            ).lean();

            return {
                count: Number(counter?.count || 1),
                windowStartMs,
            };
        } catch (error) {
            if (error?.code === 11000) {
                lastError = error;
                continue;
            }
            throw error;
        }
    }

    throw lastError || new Error('Không thể cập nhật bộ đếm rate limit');
};

const consumeCounter = async ({ scope, ip, windowMs, now, memoryMap }) => {
    if (shouldUseMongoRateLimit()) {
        try {
            return await consumeMongoCounter({ scope, ip, windowMs, now });
        } catch (error) {
            // Fallback memory để không làm gián đoạn request nếu DB rate-limit gặp lỗi tạm thời.
            logRateLimitFallback(scope, error);
            return consumeMemoryCounter({ map: memoryMap, ip, windowMs, now });
        }
    }
    return consumeMemoryCounter({ map: memoryMap, ip, windowMs, now });
};

const sendRateLimitResponse = (res, message) =>
    res.status(429).json({
        status: 'ERR',
        code: 'RATE_LIMITED',
        message,
    });

const basicRateLimit = async (req, res, next) => {
    try {
        const now = Date.now();
        const ip = getClientIp(req);
        const max = MAX_REQUESTS_PER_WINDOW;
        const counter = await consumeCounter({
            scope: 'global-basic',
            ip,
            windowMs: WINDOW_MS,
            now,
            memoryMap: basicMemoryMap,
        });

        setRateLimitHeaders(res, {
            max,
            remaining: max - counter.count,
            windowStartMs: counter.windowStartMs,
            windowMs: WINDOW_MS,
        });

        if (counter.count > max) {
            return sendRateLimitResponse(res, 'Quá nhiều yêu cầu, vui lòng thử lại sau');
        }

        return next();
    } catch (error) {
        return next(error);
    }
};

const scopedRateLimit = ({ key = 'default', windowMs = 60 * 1000, max = 30, message = 'Quá nhiều yêu cầu, vui lòng thử lại sau' } = {}) => {
    const normalizedKey = String(key || 'default');
    const normalizedWindowMs = parsePositiveInteger(windowMs, {
        defaultValue: 60 * 1000,
        min: 1000,
        max: 60 * 60 * 1000,
    });
    const normalizedMax = parsePositiveInteger(max, {
        defaultValue: 30,
        min: 1,
        max: 100000,
    });

    if (!scopedRateLimitMaps.has(normalizedKey)) {
        scopedRateLimitMaps.set(normalizedKey, new Map());
    }
    const map = scopedRateLimitMaps.get(normalizedKey);

    return async (req, res, next) => {
        try {
            const now = Date.now();
            const ip = getClientIp(req);
            const counter = await consumeCounter({
                scope: `scope-${normalizedKey}`,
                ip,
                windowMs: normalizedWindowMs,
                now,
                memoryMap: map,
            });

            setRateLimitHeaders(res, {
                max: normalizedMax,
                remaining: normalizedMax - counter.count,
                windowStartMs: counter.windowStartMs,
                windowMs: normalizedWindowMs,
            });

            if (counter.count > normalizedMax) {
                return sendRateLimitResponse(res, message);
            }
            return next();
        } catch (error) {
            return next(error);
        }
    };
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
    scopedRateLimit,
    sanitizePayload,
};
