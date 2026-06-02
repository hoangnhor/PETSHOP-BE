const test = require('node:test');
const assert = require('node:assert/strict');
const buildApp = require('../src/app');
const BillService = require('../src/services/BillServices');

const startServer = async () => {
  const app = buildApp();
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  const port = server.address().port;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
};

test('GET /api/bill/getall without token returns 401', async () => {
  const { baseUrl, close } = await startServer();
  try {
    const response = await fetch(`${baseUrl}/api/bill/getall`);
    const body = await response.json();
    assert.equal(response.status, 401);
    assert.equal(body.status, 'ERR');
  } finally {
    await close();
  }
});

test('GET /api/user/getall without admin token returns 401', async () => {
  const { baseUrl, close } = await startServer();
  try {
    const response = await fetch(`${baseUrl}/api/user/getall`);
    const body = await response.json();
    assert.equal(response.status, 401);
    assert.equal(body.status, 'ERR');
  } finally {
    await close();
  }
});

test('POST /api/bill/payment-callback forwards signature and raw body', async () => {
  const originalConfirm = BillService.confirmPaymentFromWebhook;
  const captured = { payload: null, signature: null, rawBody: null };
  BillService.confirmPaymentFromWebhook = async (payload, signature, rawBody) => {
    captured.payload = payload;
    captured.signature = signature;
    captured.rawBody = rawBody;
    return { status: 'OK', message: 'Webhook accepted' };
  };

  const { baseUrl, close } = await startServer();
  try {
    const rawBody = '{"billId":"507f1f77bcf86cd7994394b1","status":"paid","amount":250000}';
    const response = await fetch(`${baseUrl}/api/bill/payment-callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-payment-signature': 'sha256=fake-signature',
      },
      body: rawBody,
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.status, 'OK');
    assert.equal(captured.signature, 'sha256=fake-signature');
    assert.equal(captured.rawBody, rawBody);
    assert.deepEqual(captured.payload, {
      billId: '507f1f77bcf86cd7994394b1',
      status: 'paid',
      amount: 250000,
    });
  } finally {
    BillService.confirmPaymentFromWebhook = originalConfirm;
    await close();
  }
});
