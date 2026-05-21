const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

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
const ReviewServices = require('../src/services/ReviewServices');
const AppointmentServices = require('../src/services/AppointmentServices');

const original = {};

test.afterEach(() => {
  if (original.User_findOne) User.findOne = original.User_findOne;
  if (original.User_findById) User.findById = original.User_findById;
  if (original.User_updateOne) User.updateOne = original.User_updateOne;
  if (original.Product_findById) Product.findById = original.Product_findById;
  if (original.Product_updateOne) Product.updateOne = original.Product_updateOne;
  if (original.Product_findOneAndUpdate) Product.findOneAndUpdate = original.Product_findOneAndUpdate;
  if (original.Coupon_findOne) Coupon.findOne = original.Coupon_findOne;
  if (original.Coupon_findOneAndUpdate) Coupon.findOneAndUpdate = original.Coupon_findOneAndUpdate;
  if (original.Bill_create) Bill.create = original.Bill_create;
  if (original.Bill_findById) Bill.findById = original.Bill_findById;
  if (original.Bill_findOneAndUpdate) Bill.findOneAndUpdate = original.Bill_findOneAndUpdate;
  if (original.Bill_updateOne) Bill.updateOne = original.Bill_updateOne;
  if (original.Bill_findOne) Bill.findOne = original.Bill_findOne;
  if (original.Cart_findOneAndUpdate) Cart.findOneAndUpdate = original.Cart_findOneAndUpdate;
  if (original.InventoryLog_create) InventoryLog.create = original.InventoryLog_create;
  if (original.Review_create) Review.create = original.Review_create;
  if (original.Appointment_find) Appointment.find = original.Appointment_find;
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
  original.Coupon_findOne = Coupon.findOne;
  original.Coupon_findOneAndUpdate = Coupon.findOneAndUpdate;
  original.Bill_create = Bill.create;
  original.Cart_findOneAndUpdate = Cart.findOneAndUpdate;
  original.InventoryLog_create = InventoryLog.create;
  original.mongoose_startSession = mongoose.startSession;

  User.findById = async () => ({ _id: 'u1', name: 'Customer', phone: '0909', address: 'X' });
  const product = { _id: '507f1f77bcf86cd799439011', name: 'P1', price: 100000, discount: 0, countInStock: 10, isActive: true };
  Product.findById = () => ({ ...product, session: async () => product });
  Product.updateOne = async () => ({ modifiedCount: 1 });
  Coupon.findOne = () => ({ session: async () => ({ _id: 'c1', code: 'SALE10', isActive: true, discountType: 'percent', discountValue: 10, minOrderValue: 0, usageLimit: 5, usedCount: 0 }) });
  let used = 0;
  Coupon.findOneAndUpdate = async () => { used += 1; return { code: 'SALE10' }; };
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
  Appointment.find = () => ({ select: () => ({ lean: async () => [{ scheduleAt: '2026-05-21T10:00:00.000Z', endAt: '2026-05-21T11:00:00.000Z' }] }) });

  const res = await AppointmentServices.getAvailableSlots({ date: '2026-05-21', serviceIds: '507f1f77bcf86cd799439011', stepMin: 30, openHour: 8, closeHour: 12 });
  assert.equal(res.status, 'OK');
  assert.equal(res.data.slots.some((slot) => slot.startAt.startsWith('2026-05-21T10:00')), false);
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
