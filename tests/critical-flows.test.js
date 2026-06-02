const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const User = require('../src/models/UserModel');
const Product = require('../src/models/ProductModel');
const Coupon = require('../src/models/CouponModel');
const Bill = require('../src/models/BillModel');
const Cart = require('../src/models/CartModel');
const InventoryLog = require('../src/models/InventoryLogModel');
const Review = require('../src/models/ReviewModel');
const Appointment = require('../src/models/AppointmentModel');
const Service = require('../src/models/ServiceModel');

const UserServices = require('../src/services/UserServices');
const BillServices = require('../src/services/BillServices');
const CouponServices = require('../src/services/CouponServices');
const ReviewServices = require('../src/services/ReviewServices');
const AppointmentServices = require('../src/services/AppointmentServices');
const JwtServices = require('../src/services/JwtServices');
const { env } = require('../src/config/env');
const AuthMiddleware = require('../src/middleware/authMiddleware');

const original = {};

test.afterEach(() => {
  if (original.User_findOne) User.findOne = original.User_findOne;
  if (original.User_findById) User.findById = original.User_findById;
  if (original.User_updateOne) User.updateOne = original.User_updateOne;
  if (original.User_create) User.create = original.User_create;
  if (original.Product_findById) Product.findById = original.Product_findById;
  if (original.Product_updateOne) Product.updateOne = original.Product_updateOne;
  if (original.Product_findOneAndUpdate) Product.findOneAndUpdate = original.Product_findOneAndUpdate;
  if (original.Coupon_findOne) Coupon.findOne = original.Coupon_findOne;
  if (original.Coupon_findOneAndUpdate) Coupon.findOneAndUpdate = original.Coupon_findOneAndUpdate;
  if (original.Bill_create) Bill.create = original.Bill_create;
  if (original.Bill_findById) Bill.findById = original.Bill_findById;
  if (original.Bill_countDocuments) Bill.countDocuments = original.Bill_countDocuments;
  if (original.Bill_findOneAndUpdate) Bill.findOneAndUpdate = original.Bill_findOneAndUpdate;
  if (original.Bill_updateOne) Bill.updateOne = original.Bill_updateOne;
  if (original.Bill_findOne) Bill.findOne = original.Bill_findOne;
  if (original.Cart_findOneAndUpdate) Cart.findOneAndUpdate = original.Cart_findOneAndUpdate;
  if (original.InventoryLog_create) InventoryLog.create = original.InventoryLog_create;
  if (original.Review_create) Review.create = original.Review_create;
  if (original.Appointment_find) Appointment.find = original.Appointment_find;
  if (original.Appointment_findById) Appointment.findById = original.Appointment_findById;
  if (original.Service_find) Service.find = original.Service_find;
  if (original.mongoose_startSession) mongoose.startSession = original.mongoose_startSession;
});

test('blocked account cannot login', async () => {
  original.User_findOne = User.findOne;
  const hash = bcrypt.hashSync('Blocked@123', 10);
  User.findOne = () => ({ select: async () => ({ _id: 'u1', email: 'blocked@test.com', password: hash, isAdmin: false, status: 'blocked' }) });

  const response = await UserServices.loginUser({ email: 'blocked@test.com', password: 'Blocked@123' });
  assert.equal(response.status, 'ERR');
});

test('coupon applied in bill and usedCount increments', async () => {
  original.User_findById = User.findById;
  original.Product_findById = Product.findById;
  original.Product_updateOne = Product.updateOne;
  original.Coupon_findOneAndUpdate = Coupon.findOneAndUpdate;
  original.Bill_create = Bill.create;
  original.Cart_findOneAndUpdate = Cart.findOneAndUpdate;
  original.InventoryLog_create = InventoryLog.create;
  original.mongoose_startSession = mongoose.startSession;

  User.findById = async () => ({ _id: 'u1', name: 'Customer', phone: '0909', address: 'X' });
  const product = { _id: '507f1f77bcf86cd799439011', name: 'P1', price: 100000, discount: 0, countInStock: 10, isActive: true };
  Product.findById = () => ({ ...product, session: async () => product });
  Product.updateOne = async () => ({ modifiedCount: 1 });
  let used = 0;
  Coupon.findOneAndUpdate = async (filter, update) => {
    if (update?.$inc?.usedCount) {
      used += 1;
      return { code: 'SALE10' };
    }
    return {
      _id: 'c1',
      code: 'SALE10',
      isActive: true,
      discountType: 'percent',
      discountValue: 10,
      minOrderValue: 0,
      usageLimit: 5,
      usedCount: 0,
      perUserLimit: 0,
    };
  };
  let created = null;
  Bill.create = async (docs) => { created = { _id: 'b1', ...docs[0] }; return [created]; };
  Cart.findOneAndUpdate = async () => ({}); 
  InventoryLog.create = async () => ({});
  mongoose.startSession = async () => ({ withTransaction: async (fn) => fn(), endSession: async () => {} });

  const res = await BillServices.createBill({ items: [{ idsp: '507f1f77bcf86cd799439011', quantity: 2 }], shippingAddress: { fullName: 'A', phone: '0909', address: 'X' }, couponCode: 'SALE10' }, 'u1');
  assert.equal(res.status, 'OK', res.message);
  assert.equal(created.tongtien, 180000);
  assert.equal(used, 1);
});

test('coupon perUserLimit blocks reuse for same account', async () => {
  original.User_findById = User.findById;
  original.Product_findById = Product.findById;
  original.Coupon_findOneAndUpdate = Coupon.findOneAndUpdate;
  original.Bill_countDocuments = Bill.countDocuments;
  original.mongoose_startSession = mongoose.startSession;

  User.findById = async () => ({ _id: 'u1', name: 'Customer', phone: '0909', address: 'X' });
  const product = { _id: '507f1f77bcf86cd799439011', name: 'P1', price: 100000, discount: 0, countInStock: 10, isActive: true };
  Product.findById = async () => product;
  Coupon.findOneAndUpdate = async (filter, update) => {
    if (update?.$inc?.usedCount) {
      return { code: 'ONLY1' };
    }
    return {
      _id: 'c1',
      code: 'ONLY1',
      isActive: true,
      discountType: 'percent',
      discountValue: 10,
      minOrderValue: 0,
      usageLimit: 100,
      usedCount: 1,
      perUserLimit: 1,
    };
  };
  Bill.countDocuments = () => ({
    session: async () => 1,
  });
  mongoose.startSession = async () => ({ withTransaction: async (fn) => fn(), endSession: async () => {} });

  const res = await BillServices.createBill(
    {
      items: [{ idsp: '507f1f77bcf86cd799439011', quantity: 1 }],
      shippingAddress: { fullName: 'A', phone: '0909', address: 'X' },
      couponCode: 'ONLY1',
    },
    'u1'
  );
  assert.equal(res.status, 'ERR');
  assert.match(res.message, /tối đa 1 lần/i);
});

test('review requires delivered bill', async () => {
  original.Product_findById = Product.findById;
  original.Bill_findOne = Bill.findOne;
  original.Review_create = Review.create;

  Product.findById = () => ({ lean: async () => ({ _id: '507f1f77bcf86cd799439011', isActive: true }) });
  Bill.findOne = (query) => ({ lean: async () => (query?._id === '507f1f77bcf86cd799439099' ? { _id: query._id } : null) });
  Review.create = async (payload) => payload;

  const fail = await ReviewServices.createReview('u1', { productId: '507f1f77bcf86cd799439011', rating: 5 });
  assert.equal(fail.status, 'ERR');

  const ok = await ReviewServices.createReview('u1', { productId: '507f1f77bcf86cd799439011', billId: '507f1f77bcf86cd799439099', rating: 5 });
  assert.equal(ok.status, 'OK');
});

test('appointment availability excludes occupied slots', async () => {
  original.Service_find = Service.find;
  original.Appointment_find = Appointment.find;

  Service.find = () => ({ lean: async () => [{ _id: '507f1f77bcf86cd799439011', durationMin: 60, price: 100000, salePrice: 0 }] });
  Appointment.find = () => ({ select: () => ({ lean: async () => [{ scheduleAt: '2026-05-21T02:00:00.000Z', endAt: '2026-05-21T03:00:00.000Z' }] }) });

  const res = await AppointmentServices.getAvailableSlots({ date: '2026-05-21', serviceIds: '507f1f77bcf86cd799439011', stepMin: 30, openHour: 8, closeHour: 12 });
  assert.equal(res.status, 'OK');
  assert.equal(res.data.slots.some((slot) => slot.startAt.startsWith('2026-05-21T02:00')), false);
  assert.equal(res.data.slots[0].startAt.startsWith('2026-05-21T01:00'), true);
  assert.equal(res.data.slots[0].timezone, 'Asia/Ho_Chi_Minh');
});

test('cancelBill restores stock and logs release', async () => {
  original.Bill_findById = Bill.findById;
  original.Bill_findOneAndUpdate = Bill.findOneAndUpdate;
  original.Product_findOneAndUpdate = Product.findOneAndUpdate;
  original.Product_updateOne = Product.updateOne;
  original.InventoryLog_create = InventoryLog.create;
  original.mongoose_startSession = mongoose.startSession;

  const billId = '507f1f77bcf86cd7994390a1';
  const productId = '507f1f77bcf86cd7994390b1';
  Bill.findById = async () => ({ _id: billId, iduser: 'u1', orderStatus: 'pending', paymentStatus: 'paid', items: [{ idsp: productId, quantity: 2 }] });
  Bill.findOneAndUpdate = async () => ({ _id: billId, orderStatus: 'cancelled', items: [{ idsp: productId, quantity: 2 }] });
  Product.findOneAndUpdate = async () => ({ countInStock: 12 });
  Product.updateOne = async () => ({});
  const logs = [];
  InventoryLog.create = async (docs) => { logs.push(...docs); return docs; };
  mongoose.startSession = async () => ({ withTransaction: async (fn) => fn(), endSession: async () => {} });

  const res = await BillServices.cancelBill(billId, 'u1', false, 'reason');
  assert.equal(res.status, 'OK');
  assert.equal(logs.length, 1);
  assert.equal(logs[0].type, 'release');
});

test('deleteBill performs soft delete', async () => {
  original.Bill_findById = Bill.findById;
  original.Bill_findOneAndUpdate = Bill.findOneAndUpdate;
  original.Bill_updateOne = Bill.updateOne;
  original.Product_findOneAndUpdate = Product.findOneAndUpdate;
  original.Product_updateOne = Product.updateOne;
  original.InventoryLog_create = InventoryLog.create;
  original.mongoose_startSession = mongoose.startSession;

  const billId = '507f1f77bcf86cd7994390c1';
  const actorId = '507f1f77bcf86cd7994390d1';
  const productId = '507f1f77bcf86cd7994390e1';

  let first = true;
  Bill.findById = () => {
    if (first) {
      first = false;
      return Promise.resolve({ _id: billId, isDeleted: false, orderStatus: 'pending', items: [{ idsp: productId, quantity: 1 }] });
    }
    return { session: async () => ({ _id: billId, isDeleted: false, orderStatus: 'pending', items: [{ idsp: productId, quantity: 1 }] }) };
  };

  Bill.findOneAndUpdate = async () => ({ _id: billId, orderStatus: 'cancelled', items: [{ idsp: productId, quantity: 1 }] });
  let soft = null;
  Bill.updateOne = async (filter, update) => { soft = { filter, update }; return { modifiedCount: 1 }; };
  Product.findOneAndUpdate = async () => ({ countInStock: 10 });
  Product.updateOne = async () => ({});
  InventoryLog.create = async () => ({});
  mongoose.startSession = async () => ({ withTransaction: async (fn) => fn(), endSession: async () => {} });

  const res = await BillServices.deleteBill(billId, actorId);
  assert.equal(res.status, 'OK');
  assert.equal(soft.update.$set.isDeleted, true);
});

test('updateBillStatus blocks invalid order transition', async () => {
  original.Bill_findById = Bill.findById;
  Bill.findById = async () => ({
    _id: '507f1f77bcf86cd7994392a1',
    isDeleted: false,
    orderStatus: 'pending',
    paymentStatus: 'unpaid',
    paymentMethod: 'COD',
    save: async () => ({}),
  });

  const response = await BillServices.updateBillStatus('507f1f77bcf86cd7994392a1', {
    orderStatus: 'delivered',
  });

  assert.equal(response.status, 'ERR');
  assert.match(response.message, /không thể chuyển đơn/i);
});

test('updateBillStatus blocks refunded on non-cancelled order', async () => {
  original.Bill_findById = Bill.findById;
  Bill.findById = async () => ({
    _id: '507f1f77bcf86cd7994392b1',
    isDeleted: false,
    orderStatus: 'shipping',
    paymentStatus: 'paid',
    paymentMethod: 'BANKING',
    save: async () => ({}),
  });

  const response = await BillServices.updateBillStatus('507f1f77bcf86cd7994392b1', {
    paymentStatus: 'refunded',
  });
  assert.equal(response.status, 'ERR');
  assert.match(response.message, /đã hủy/i);
});

test('validateCouponCode enforces per-user limit when userId is provided', async () => {
  original.Coupon_findOne = Coupon.findOne;
  original.Bill_countDocuments = Bill.countDocuments;

  Coupon.findOne = () => ({
    lean: async () => ({
      _id: 'c1',
      code: 'ONLY1',
      isActive: true,
      discountType: 'fixed',
      discountValue: 10000,
      minOrderValue: 0,
      usageLimit: 100,
      usedCount: 1,
      perUserLimit: 1,
      startsAt: null,
      endsAt: null,
    }),
  });
  Bill.countDocuments = async () => 1;

  const response = await CouponServices.validateCouponCode('ONLY1', 100000, '507f1f77bcf86cd799439999');
  assert.equal(response.status, 'ERR');
  assert.match(response.message, /tối đa 1 lần/i);
});

test('blocked user cannot refresh token', async () => {
  original.User_findById = User.findById;
  original.User_updateOne = User.updateOne;
  const userId = '507f1f77bcf86cd7994390f1';
  const token = jwt.sign({ id: userId, email: 'blocked@test.com', isAdmin: false }, env.refreshTokenSecret, {
    expiresIn: '1h',
  });

  User.findById = () => ({
    select: () => ({
      lean: async () => ({ _id: userId, email: 'blocked@test.com', isAdmin: false, status: 'blocked' }),
    }),
  });
  User.updateOne = async () => ({ modifiedCount: 1 });

  const response = await JwtServices.refreshTokenJwtService(token);
  assert.equal(response.status, 'ERR');
});

test('normal user cannot change appointment status via update endpoint', async () => {
  original.Appointment_findById = Appointment.findById;

  Appointment.findById = () => ({
    lean: async () => ({
      _id: '507f1f77bcf86cd7994391a1',
      userId: 'u1',
      petId: '507f1f77bcf86cd7994391b1',
      serviceIds: ['507f1f77bcf86cd7994391c1'],
      scheduleAt: new Date('2026-05-21T10:00:00.000Z'),
      durationMin: 60,
      pricing: { subTotal: 100000, discountTotal: 0, finalTotal: 100000, paymentStatus: 'unpaid', paymentMethod: 'cash' },
      status: 'pending',
    }),
  });

  const response = await AppointmentServices.updateAppointment(
    '507f1f77bcf86cd7994391a1',
    'u1',
    false,
    { status: 'completed' }
  );

  assert.equal(response.status, 'ERR');
});

test('appointment status cannot skip transition', async () => {
  original.Appointment_findById = Appointment.findById;
  Appointment.findById = () => ({
    lean: async () => ({
      _id: '507f1f77bcf86cd7994393a1',
      userId: 'u1',
      petId: '507f1f77bcf86cd7994393b1',
      serviceIds: ['507f1f77bcf86cd7994393c1'],
      scheduleAt: new Date('2026-05-21T10:00:00.000Z'),
      durationMin: 60,
      pricing: { subTotal: 100000, discountTotal: 0, finalTotal: 100000, paymentStatus: 'unpaid', paymentMethod: 'cash' },
      status: 'confirmed',
    }),
  });

  const response = await AppointmentServices.updateAppointment(
    '507f1f77bcf86cd7994393a1',
    'u1',
    true,
    { status: 'completed' }
  );
  assert.equal(response.status, 'ERR');
  assert.match(response.message, /không thể chuyển lịch/i);
});

test('refresh token can be reused once within grace window without revoking session', async () => {
  original.User_findById = User.findById;
  original.User_updateOne = User.updateOne;

  const userId = '507f1f77bcf86cd7994394a1';
  const oldRefreshToken = jwt.sign(
    { id: userId, email: 'race@test.com', isAdmin: false, type: 'refresh' },
    env.refreshTokenSecret,
    { expiresIn: '1h' }
  );

  const state = {
    _id: userId,
    email: 'race@test.com',
    isAdmin: false,
    status: 'active',
    refreshTokenHash: crypto.createHash('sha256').update(oldRefreshToken).digest('hex'),
    refreshTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    previousRefreshTokenHash: '',
    previousRefreshTokenGraceUntil: null,
  };

  User.findById = () => ({
    select: () => ({
      lean: async () => ({ ...state }),
    }),
  });

  User.updateOne = async (filter, update) => {
    if (String(filter?._id) !== String(userId)) return { modifiedCount: 0 };
    const nextSet = update?.$set || {};
    Object.assign(state, nextSet);
    return { modifiedCount: 1 };
  };

  const first = await JwtServices.refreshTokenJwtService(oldRefreshToken);
  assert.equal(first.status, 'OK');
  assert.ok(first.refresh_token);
  assert.ok(state.previousRefreshTokenHash);

  const second = await JwtServices.refreshTokenJwtService(oldRefreshToken);
  assert.equal(second.status, 'OK');
  assert.ok(second.access_token);
  assert.equal(second.refresh_token, undefined);
});

test('payment webhook marks bill as paid when signature is valid', async () => {
  original.Bill_findById = Bill.findById;
  const previousSecret = env.paymentWebhookSecret;
  env.paymentWebhookSecret = 'test-payment-secret';
  try {
    const billDoc = {
      _id: '507f1f77bcf86cd7994394b1',
      isDeleted: false,
      orderStatus: 'pending',
      paymentStatus: 'unpaid',
      paymentMethod: 'VNPAY',
      tongtien: 250000,
      paidAt: null,
      paymentGateway: {},
      save: async function save() { return this; },
    };

    Bill.findById = async () => billDoc;

    const payload = {
      billId: '507f1f77bcf86cd7994394b1',
      status: 'paid',
      provider: 'VNPAY',
      transactionId: 'TXN-001',
      amount: 250000,
    };
    const rawPayload = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', env.paymentWebhookSecret)
      .update(rawPayload)
      .digest('hex');

    const response = await BillServices.confirmPaymentFromWebhook(payload, `sha256=${signature}`, rawPayload);
    assert.equal(response.status, 'OK');
    assert.equal(billDoc.paymentStatus, 'paid');
    assert.equal(billDoc.paymentGateway.transactionId, 'TXN-001');
  } finally {
    env.paymentWebhookSecret = previousSecret;
  }
});

test('verifyToken blocks account that is blocked in database', async () => {
  original.User_findById = User.findById;
  const userId = '507f1f77bcf86cd7994394c1';
  const token = jwt.sign(
    { id: userId, email: 'blocked-now@test.com', isAdmin: true },
    env.accessTokenSecret,
    { expiresIn: '15m' }
  );

  User.findById = () => ({
    select: () => ({
      lean: async () => ({
        _id: userId,
        status: 'blocked',
        isAdmin: true,
      }),
    }),
  });

  const req = {
    headers: { authorization: `Bearer ${token}` },
    params: {},
  };

  const result = {
    statusCode: 200,
    payload: null,
  };
  const res = {
    status(code) {
      result.statusCode = code;
      return this;
    },
    json(payload) {
      result.payload = payload;
      return this;
    },
  };
  let nextCalled = false;
  await AuthMiddleware.verifyToken(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(result.statusCode, 403);
  assert.equal(result.payload?.status, 'ERR');
});

test('createUser returns business error when duplicate key happens concurrently', async () => {
  original.User_findOne = User.findOne;
  original.User_create = User.create;

  User.findOne = async () => null;
  const duplicateError = new Error('duplicate key');
  duplicateError.code = 11000;
  User.create = async () => {
    throw duplicateError;
  };

  const response = await UserServices.createUser({
    name: 'User 1',
    email: 'dup@test.com',
    password: '123456',
  });

  assert.equal(response.status, 'ERR');
  assert.match(response.message, /email đã tồn tại/i);
});

test('deleteUser performs soft delete and clears refresh session fields', async () => {
  original.User_findOne = User.findOne;
  original.User_updateOne = User.updateOne;

  const targetUserId = '507f1f77bcf86cd7994395b1';
  const adminUserId = '507f1f77bcf86cd7994395b2';
  User.findOne = async () => ({
    _id: targetUserId,
    isDeleted: false,
    status: 'active',
  });

  let updatedPayload = null;
  User.updateOne = async (filter, update) => {
    updatedPayload = { filter, update };
    return { modifiedCount: 1 };
  };

  const response = await UserServices.deleteUser(targetUserId, adminUserId);
  assert.equal(response.status, 'OK');
  assert.equal(updatedPayload.filter._id, targetUserId);
  assert.equal(updatedPayload.update.$set.status, 'blocked');
  assert.equal(updatedPayload.update.$set.isDeleted, true);
  assert.equal(updatedPayload.update.$set.deletedBy, adminUserId);
  assert.equal(updatedPayload.update.$set.refreshTokenHash, '');
  assert.equal(updatedPayload.update.$set.refreshTokenExpiresAt, null);
  assert.equal(updatedPayload.update.$set.previousRefreshTokenHash, '');
  assert.equal(updatedPayload.update.$set.previousRefreshTokenGraceUntil, null);
});

test('refresh token rotation fails safely on compare-and-swap conflict', async () => {
  original.User_findById = User.findById;
  original.User_updateOne = User.updateOne;

  const userId = '507f1f77bcf86cd7994395a1';
  const currentRefreshToken = jwt.sign(
    { id: userId, email: 'race-conflict@test.com', isAdmin: false, type: 'refresh' },
    env.refreshTokenSecret,
    { expiresIn: '1h' }
  );
  const currentRefreshHash = crypto.createHash('sha256').update(currentRefreshToken).digest('hex');

  User.findById = () => ({
    select: () => ({
      lean: async () => ({
        _id: userId,
        email: 'race-conflict@test.com',
        isAdmin: false,
        status: 'active',
        refreshTokenHash: currentRefreshHash,
        refreshTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        previousRefreshTokenHash: '',
        previousRefreshTokenGraceUntil: null,
      }),
    }),
  });

  User.updateOne = async (filter) => {
    if (filter?.refreshTokenHash === currentRefreshHash) {
      return { modifiedCount: 0 };
    }
    return { modifiedCount: 1 };
  };

  const response = await JwtServices.refreshTokenJwtService(currentRefreshToken);
  assert.equal(response.status, 'ERR');
  assert.match(response.message, /được làm mới ở nơi khác/i);
});
