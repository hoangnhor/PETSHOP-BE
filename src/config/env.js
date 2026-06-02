const dotenv = require('dotenv');

dotenv.config();

const asTrimmedString = (value) => (typeof value === 'string' ? value.trim() : '');

const parseBoolean = (value, defaultValue = false) => {
    if (typeof value === 'boolean') return value;
    const raw = asTrimmedString(value).toLowerCase();
    if (!raw) return defaultValue;
    if (raw === 'true' || raw === '1' || raw === 'yes') return true;
    if (raw === 'false' || raw === '0' || raw === 'no') return false;
    return defaultValue;
};

const parsePositiveInteger = (
    value,
    { defaultValue, min = 1, max = Number.MAX_SAFE_INTEGER } = {}
) => {
    const raw =
        typeof value === 'number'
            ? String(value)
            : asTrimmedString(value);
    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed)) return defaultValue;
    return Math.min(max, Math.max(min, parsed));
};

const parseTrustProxy = (value) => {
    const raw = asTrimmedString(value);
    if (!raw) return false;
    if (raw.toLowerCase() === 'true') return true;
    if (raw.toLowerCase() === 'false') return false;
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isNaN(parsed)) return parsed;
    return raw;
};

const parseSameSite = (value, defaultValue = 'lax') => {
    const raw = asTrimmedString(value).toLowerCase();
    if (!raw) return defaultValue;
    if (['lax', 'strict', 'none'].includes(raw)) return raw;
    return defaultValue;
};

const parseOrigins = (value, fallback = ['http://localhost:3000']) => {
    const raw = asTrimmedString(value);
    if (!raw) return [...fallback];
    return raw
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
};

const parseRateLimitStore = (value, defaultValue = 'mongo') => {
    const raw = asTrimmedString(value).toLowerCase();
    if (!raw) return defaultValue;
    if (raw === 'mongo' || raw === 'memory') return raw;
    return defaultValue;
};

const paymentWebhookSecret = asTrimmedString(process.env.PAYMENT_WEBHOOK_SECRET);
const paymentWebhookEnabled = parseBoolean(
    process.env.PAYMENT_WEBHOOK_ENABLED,
    Boolean(paymentWebhookSecret)
);

const requiredEnvKeys = [
    'MONGODB_URL',
    'ACCESS_TOKEN',
    'REFRESH_TOKEN',
    ...(paymentWebhookEnabled ? ['PAYMENT_WEBHOOK_SECRET'] : []),
];

const getMissingRequiredEnv = () =>
    requiredEnvKeys.filter((key) => !asTrimmedString(process.env[key]));

const assertRequiredEnv = () => {
    const missing = getMissingRequiredEnv();
    if (missing.length) {
        throw new Error(`Thiếu biến môi trường ${missing.join(', ')}`);
    }
};

const nodeEnv = asTrimmedString(process.env.NODE_ENV) || 'development';
const defaultCookieSecure = nodeEnv === 'production';
const defaultCookieSameSite = nodeEnv === 'production' ? 'none' : 'lax';
const cookieSecure = parseBoolean(process.env.COOKIE_SECURE, defaultCookieSecure);
const cookieSameSite = parseSameSite(process.env.COOKIE_SAMESITE, defaultCookieSameSite);
const refreshTokenCookieMaxAgeMs = parsePositiveInteger(process.env.REFRESH_TOKEN_COOKIE_MAX_AGE_MS, {
    defaultValue: 365 * 24 * 60 * 60 * 1000,
    min: 60 * 1000,
    max: 400 * 24 * 60 * 60 * 1000,
});
const refreshTokenReuseGraceMs = parsePositiveInteger(process.env.REFRESH_TOKEN_REUSE_GRACE_MS, {
    defaultValue: 2 * 60 * 1000,
    min: 1000,
    max: 60 * 60 * 1000,
});

const env = {
    nodeEnv,
    isProduction: nodeEnv === 'production',
    port: parsePositiveInteger(process.env.PORT, { defaultValue: 3030, min: 1, max: 65535 }),
    mongodbUrl: asTrimmedString(process.env.MONGODB_URL),
    accessTokenSecret: asTrimmedString(process.env.ACCESS_TOKEN),
    refreshTokenSecret: asTrimmedString(process.env.REFRESH_TOKEN),
    refreshTokenExpiresIn: asTrimmedString(process.env.REFRESH_TOKEN_EXPIRES_IN) || '90d',
    clientOrigins: parseOrigins(process.env.CLIENT_URL),
    trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
    rateLimitWindowMs: parsePositiveInteger(process.env.RATE_LIMIT_WINDOW_MS, {
        defaultValue: 60 * 1000,
        min: 1000,
        max: 60 * 60 * 1000,
    }),
    rateLimitMax: parsePositiveInteger(process.env.RATE_LIMIT_MAX, {
        defaultValue: 180,
        min: 1,
        max: 100000,
    }),
    rateLimitStore: parseRateLimitStore(process.env.RATE_LIMIT_STORE, 'mongo'),
    cookieSecure,
    cookieSameSite,
    refreshTokenCookieMaxAgeMs,
    refreshTokenReuseGraceMs,
    paymentWebhookEnabled,
    paymentWebhookSecret,
};

module.exports = {
    env,
    asTrimmedString,
    parseBoolean,
    parsePositiveInteger,
    assertRequiredEnv,
};
