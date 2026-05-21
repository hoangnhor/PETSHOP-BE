/* eslint-disable no-console */
const assert = require('node:assert/strict');

const BASE_URL = process.env.SMOKE_BASE_URL;
const LOGIN_EMAIL = process.env.SMOKE_LOGIN_EMAIL;
const LOGIN_PASSWORD = process.env.SMOKE_LOGIN_PASSWORD;

const requestJson = async (path, options = {}) => {
    const response = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        },
    });
    const text = await response.text();
    let body = {};
    try {
        body = text ? JSON.parse(text) : {};
    } catch (error) {
        body = { raw: text };
    }
    return { status: response.status, body };
};

const run = async () => {
    assert.ok(BASE_URL, 'Thiếu SMOKE_BASE_URL');
    assert.ok(LOGIN_EMAIL, 'Thiếu SMOKE_LOGIN_EMAIL');
    assert.ok(LOGIN_PASSWORD, 'Thiếu SMOKE_LOGIN_PASSWORD');

    const health = await requestJson('/health');
    assert.equal(health.status, 200, `Health fail: ${JSON.stringify(health.body)}`);

    const ready = await requestJson('/ready');
    assert.equal(ready.status, 200, `Ready fail: ${JSON.stringify(ready.body)}`);

    const login = await requestJson('/api/user/sign-in', {
        method: 'POST',
        body: JSON.stringify({ email: LOGIN_EMAIL, password: LOGIN_PASSWORD }),
    });
    assert.equal(login.status, 200, `Login fail: ${JSON.stringify(login.body)}`);
    const token = login.body?.access_token;
    assert.ok(token, 'Không nhận được access_token');

    const profile = await requestJson('/api/user/get-details/me', {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (profile.status === 404) {
        // fallback endpoint for current API structure
        const mePayload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
        const fallback = await requestJson(`/api/user/get-details/${mePayload.id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        assert.equal(fallback.status, 200, `Get details fail: ${JSON.stringify(fallback.body)}`);
    }

    const couponValidate = await requestJson('/api/coupon/validate?code=INVALID&orderValue=100000');
    assert.ok([200, 400].includes(couponValidate.status), `Coupon validate unexpected: ${couponValidate.status}`);

    console.log('Smoke live API: PASS');
};

run().catch((error) => {
    console.error('Smoke live API: FAIL');
    console.error(error);
    process.exit(1);
});
