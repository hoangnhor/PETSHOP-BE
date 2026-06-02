const Bill = require('../models/BillModel');
const User = require('../models/UserModel');
const Product = require('../models/ProductModel');
const Cart = require('../models/CartModel');
const InventoryLog = require('../models/InventoryLogModel');
const Coupon = require('../models/CouponModel');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { env } = require('../config/env');

const ORDER_STATUSES = ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'];
const PAYMENT_STATUSES = ['unpaid', 'paid', 'refunded'];
const PAYMENT_METHODS = ['COD', 'BANKING', 'MOMO', 'VNPAY'];
const ORDER_STATUS_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipping', 'cancelled'],
  shipping: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};
const PAYMENT_STATUS_TRANSITIONS = {
  unpaid: ['paid'],
  paid: ['refunded'],
  refunded: [],
};

const canTransition = (transitions, current, next) => {
  if (!next || current === next) return true;
  const allowed = transitions[current] || [];
  return allowed.includes(next);
};

const normalizePaymentWebhookStatus = (rawStatus = '') => {
  const normalized = String(rawStatus || '').trim().toLowerCase();
  if (['paid', 'success', 'succeeded', 'completed', 'done'].includes(normalized)) return 'paid';
  if (['refunded', 'refund', 'reversed'].includes(normalized)) return 'refunded';
  if (['failed', 'cancelled', 'canceled', 'declined'].includes(normalized)) return 'failed';
  return '';
};

const normalizeRawWebhookBody = (rawBody, payload) => {
  if (typeof rawBody === 'string' && rawBody.length) return rawBody;
  if (Buffer.isBuffer(rawBody) && rawBody.length) return rawBody.toString('utf8');
  // Fallback for direct service calls (tests/internal) when raw body is unavailable.
  try {
    return JSON.stringify(payload || {});
  } catch (error) {
    return '';
  }
};

const isValidPaymentWebhookSignature = (payload, signatureHeader, rawBody = '') => {
  if (!env.paymentWebhookSecret) return false;
  const rawSignature = String(signatureHeader || '').trim();
  if (!rawSignature) return false;
  const receivedHex = rawSignature.startsWith('sha256=') ? rawSignature.slice(7) : rawSignature;
  if (!/^[a-fA-F0-9]+$/.test(receivedHex)) return false;
  const rawPayload = normalizeRawWebhookBody(rawBody, payload);
  if (!rawPayload) return false;

  const expectedHex = crypto
    .createHmac('sha256', env.paymentWebhookSecret)
    .update(rawPayload)
    .digest('hex');

  const expectedBuffer = Buffer.from(expectedHex, 'hex');
  const receivedBuffer = Buffer.from(receivedHex, 'hex');
  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
};

const getShippingAddress = (shippingAddress, user) => ({
  fullName: shippingAddress?.fullName || user.name || '',
  phone: shippingAddress?.phone || user.phone || '',
  address: shippingAddress?.address || user.address || '',
  city: shippingAddress?.city || '',
});

const restoreStockItems = async (items, billId = null, session = null) => {
  for (const item of items) {
    const updateResult = await Product.findOneAndUpdate(
      { _id: item.idsp },
      { $inc: { countInStock: item.quantity, selled: -item.quantity } },
      { new: true, session: session || undefined }
    );
    await Product.updateOne(
      { _id: item.idsp, selled: { $lt: 0 } },
      { $set: { selled: 0 } },
      session ? { session } : {}
    );
    if (updateResult) {
      await InventoryLog.create([
        {
          productId: item.idsp,
          type: 'release',
          quantity: Number(item.quantity),
          stockAfter: Number(updateResult.countInStock || 0),
          reason: 'Hoàn trả tồn kho khi hủy/xóa đơn',
          billId,
        },
      ], session ? { session } : undefined);
    }
  }
};

const createBill = async (newBill, userId) => {
  const { items, shippingAddress, paymentMethod = 'COD', note = '', couponCode = '' } = newBill;

  if (!userId) return { status: 'ERR', message: 'Người dùng chưa đăng nhập' };
  if (!Array.isArray(items) || items.length === 0) return { status: 'ERR', message: 'Đơn hàng phải có ít nhất một sản phẩm' };
  if (!PAYMENT_METHODS.includes(paymentMethod)) return { status: 'ERR', message: 'Phương thức thanh toán không hợp lệ' };

  const user = await User.findById(userId);
  if (!user) return { status: 'ERR', message: 'Người dùng không tồn tại' };

  const normalizedShippingAddress = getShippingAddress(shippingAddress, user);
  if (!normalizedShippingAddress.fullName || !normalizedShippingAddress.phone || !normalizedShippingAddress.address) {
    return { status: 'ERR', message: 'Vui lòng cung cấp đầy đủ tên, số điện thoại và địa chỉ nhận hàng' };
  }

  let subTotal = 0;
  const orderItems = [];
  const requestedItems = new Map();

  for (const item of items) {
    const quantity = Number(item.quantity);
    if (!item.idsp || !mongoose.isValidObjectId(item.idsp) || !Number.isInteger(quantity) || quantity < 1) {
      return { status: 'ERR', message: 'Thông tin sản phẩm trong đơn hàng không hợp lệ' };
    }
    const productId = item.idsp.toString();
    requestedItems.set(productId, (requestedItems.get(productId) || 0) + quantity);
  }

  for (const [productId, quantity] of requestedItems.entries()) {
    const product = await Product.findById(productId);
    if (!product || !product.isActive) return { status: 'ERR', message: `Sản phẩm ${productId} không tồn tại hoặc đã ngừng bán` };
    if (product.countInStock < quantity) return { status: 'ERR', message: `Sản phẩm ${product.name} không đủ hàng (còn: ${product.countInStock})` };

    const priceAfterDiscount = product.price * (1 - (product.discount || 0) / 100);
    const subtotal = Math.round(priceAfterDiscount * quantity);
    subTotal += subtotal;

    orderItems.push({
      idsp: product._id,
      name: product.name,
      image: product.image || '',
      price: product.price,
      discount: product.discount || 0,
      quantity,
      subtotal,
    });
  }

  const normalizedCouponCode = String(couponCode || '').trim().toUpperCase();
  const session = await mongoose.startSession();
  try {
    let createdBill;
    await session.withTransaction(async () => {
      let couponDiscount = 0;
      let couponInfo = null;

      if (normalizedCouponCode) {
        // Lock coupon document inside transaction to avoid per-user limit race on concurrent checkout.
        const coupon = await Coupon.findOneAndUpdate(
          { code: normalizedCouponCode, isActive: true },
          { $set: { updatedAt: new Date() } },
          { new: true, session }
        );
        if (!coupon) throw new Error('Mã giảm giá không tồn tại');
        const now = Date.now();
        if (coupon.startsAt && new Date(coupon.startsAt).getTime() > now) throw new Error('Mã giảm giá chưa đến thời gian sử dụng');
        if (coupon.endsAt && new Date(coupon.endsAt).getTime() < now) throw new Error('Mã giảm giá đã hết hạn');
        if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) throw new Error('Mã giảm giá đã hết lượt sử dụng');
        const perUserLimit = Number(coupon.perUserLimit || 0);
        if (perUserLimit > 0) {
          const usedByCurrentUser = await Bill.countDocuments({
            iduser: userId,
            'coupon.code': normalizedCouponCode,
            isDeleted: { $ne: true },
          }).session(session);
          if (usedByCurrentUser >= perUserLimit) {
            throw new Error(`Mỗi tài khoản chỉ được dùng mã này tối đa ${perUserLimit} lần`);
          }
        }
        if (subTotal < Number(coupon.minOrderValue || 0)) throw new Error(`Đơn hàng chưa đạt tối thiểu ${Number(coupon.minOrderValue || 0).toLocaleString('vi-VN')}đ`);

        if (coupon.discountType === 'percent') {
          couponDiscount = (subTotal * Number(coupon.discountValue || 0)) / 100;
          if (Number(coupon.maxDiscountValue || 0) > 0) couponDiscount = Math.min(couponDiscount, Number(coupon.maxDiscountValue));
        } else {
          couponDiscount = Number(coupon.discountValue || 0);
        }

        couponDiscount = Math.max(0, Math.round(couponDiscount));

        const updatedCoupon = await Coupon.findOneAndUpdate(
          { _id: coupon._id, isActive: true, $or: [{ usageLimit: 0 }, { usedCount: { $lt: coupon.usageLimit } }] },
          { $inc: { usedCount: 1 } },
          { new: true, session }
        );
        if (!updatedCoupon) throw new Error('Không thể áp dụng mã giảm giá');
        couponInfo = updatedCoupon;
      }

      const tongtien = Math.max(0, subTotal - couponDiscount);

      for (const item of orderItems) {
        const updateResult = await Product.updateOne(
          { _id: item.idsp, countInStock: { $gte: item.quantity } },
          { $inc: { countInStock: -item.quantity, selled: item.quantity } },
          { session }
        );
        if (updateResult.modifiedCount !== 1) throw new Error(`Sản phẩm ${item.name} không đủ hàng`);
      }

      const createdBills = await Bill.create([
        {
          iduser: userId,
          items: orderItems,
          shippingAddress: normalizedShippingAddress,
          paymentMethod,
          paymentStatus: 'unpaid',
          orderStatus: 'pending',
          tongtien,
          pricing: {
            subTotal,
            discountTotal: couponDiscount,
            shippingFee: 0,
            taxTotal: 0,
            grandTotal: tongtien,
            currency: 'VND',
          },
          coupon: {
            code: couponInfo?.code || '',
            discountAmount: couponDiscount,
          },
          note,
          paidAt: null,
        },
      ], { session });
      createdBill = createdBills[0];

      for (const item of orderItems) {
        const product = await Product.findById(item.idsp).session(session);
        if (!product) continue;
        await InventoryLog.create([
          {
            productId: item.idsp,
            type: 'out',
            quantity: Number(item.quantity),
            stockAfter: Number(product.countInStock || 0),
            reason: 'Trừ tồn kho khi tạo đơn',
            billId: createdBill._id,
          },
        ], { session });
      }

      await Cart.findOneAndUpdate(
        { userId },
        { $pull: { items: { productId: { $in: orderItems.map((item) => item.idsp) } } } },
        { session }
      );
    });

    return { status: 'OK', message: 'Tạo đơn hàng thành công', data: createdBill };
  } catch (error) {
    return { status: 'ERR', message: error.message || 'Tạo đơn hàng thất bại' };
  } finally {
    await session.endSession();
  }
};

const getAllBill = async (userId, isAdmin, query = {}) => {
  const filter = { isDeleted: false };
  if (isAdmin && String(query.includeDeleted) === 'true') delete filter.isDeleted;
  if (!isAdmin) filter.iduser = userId;
  if (query.orderStatus) filter.orderStatus = query.orderStatus;
  if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;

  const limit = Math.min(Math.max(parseInt(query.limit) || 50, 1), 200);
  const page = Math.max(parseInt(query.page) || 0, 0);

  const total = await Bill.countDocuments(filter);
  const allBills = await Bill.find(filter)
    .populate('iduser', 'name email phone address')
    .populate('items.idsp')
    .sort({ createdAt: -1 })
    .skip(page * limit)
    .limit(limit)
    .lean();

  return { status: 'OK', message: 'Thành công', data: allBills, total, pageCurrent: page + 1, totalPage: Math.ceil(total / limit) };
};

const getDetailsBill = async (billId, userId, isAdmin) => {
  if (!mongoose.isValidObjectId(billId)) return { status: 'ERR', message: 'Bill ID không hợp lệ' };

  const bill = await Bill.findById(billId).populate('iduser', 'name email phone address').populate('items.idsp');
  if (!bill) return { status: 'ERR', message: 'Hóa đơn không tồn tại' };
  if (bill.isDeleted && !isAdmin) return { status: 'ERR', message: 'Hóa đơn không tồn tại' };
  const ownerId = String(bill.iduser?._id || bill.iduser || '');
  if (!ownerId) return { status: 'ERR', message: 'Chủ đơn hàng không tồn tại' };
  if (!isAdmin && ownerId !== String(userId)) return { status: 'ERR', message: 'Bạn không có quyền xem hóa đơn này' };

  return { status: 'OK', message: 'Thành công', data: bill };
};

const updateBillStatus = async (billId, payload) => {
  const { orderStatus, paymentStatus, cancelReason = '' } = payload;
  if (!mongoose.isValidObjectId(billId)) return { status: 'ERR', message: 'Bill ID không hợp lệ' };

  const bill = await Bill.findById(billId);
  if (!bill) return { status: 'ERR', message: 'Hóa đơn không tồn tại' };
  if (bill.isDeleted) return { status: 'ERR', message: 'Không thể cập nhật đơn hàng đã xóa' };
  if (orderStatus && !ORDER_STATUSES.includes(orderStatus)) return { status: 'ERR', message: 'Trạng thái đơn hàng không hợp lệ' };
  if (paymentStatus && !PAYMENT_STATUSES.includes(paymentStatus)) return { status: 'ERR', message: 'Trạng thái thanh toán không hợp lệ' };
  if (bill.orderStatus === 'cancelled') return { status: 'ERR', message: 'Không thể cập nhật đơn hàng đã hủy' };
  if (orderStatus && !canTransition(ORDER_STATUS_TRANSITIONS, bill.orderStatus, orderStatus)) {
    return {
      status: 'ERR',
      message: `Không thể chuyển đơn từ ${bill.orderStatus} sang ${orderStatus}`,
    };
  }
  if (paymentStatus && !canTransition(PAYMENT_STATUS_TRANSITIONS, bill.paymentStatus, paymentStatus)) {
    return {
      status: 'ERR',
      message: `Không thể chuyển thanh toán từ ${bill.paymentStatus} sang ${paymentStatus}`,
    };
  }
  if (paymentStatus === 'refunded' && bill.orderStatus !== 'cancelled' && orderStatus !== 'cancelled') {
    return { status: 'ERR', message: 'Chỉ có thể hoàn tiền cho đơn hàng đã hủy' };
  }

  if (orderStatus === 'cancelled') return cancelBill(billId, null, true, cancelReason);
  if (orderStatus === 'delivered' && paymentStatus === 'unpaid') {
    return { status: 'ERR', message: 'Đơn đã giao không thể để trạng thái chưa thanh toán' };
  }

  if (orderStatus) {
    bill.orderStatus = orderStatus;
    if (orderStatus === 'delivered') {
      bill.deliveredAt = new Date();
      if (bill.paymentMethod === 'COD' && bill.paymentStatus === 'unpaid') {
        bill.paymentStatus = 'paid';
        bill.paidAt = new Date();
      }
    }
  }

  if (paymentStatus) {
    bill.paymentStatus = paymentStatus;
    if (paymentStatus === 'paid' && !bill.paidAt) bill.paidAt = new Date();
  }

  await bill.save();
  return { status: 'OK', message: 'Cập nhật đơn hàng thành công', data: bill };
};

const cancelBill = async (billId, userId, isAdmin = false, cancelReason = '') => {
  if (!mongoose.isValidObjectId(billId)) return { status: 'ERR', message: 'Bill ID không hợp lệ' };

  const bill = await Bill.findById(billId);
  if (!bill) return { status: 'ERR', message: 'Hóa đơn không tồn tại' };
  if (bill.isDeleted) return { status: 'ERR', message: 'Không thể hủy đơn hàng đã xóa' };
  if (!isAdmin && bill.iduser.toString() !== userId) return { status: 'ERR', message: 'Bạn không có quyền hủy đơn hàng này' };
  if (['delivered', 'cancelled'].includes(bill.orderStatus)) return { status: 'ERR', message: 'Không thể hủy đơn hàng đã giao hoặc đã hủy' };

  const session = await mongoose.startSession();
  try {
    let cancelledBill;
    await session.withTransaction(async () => {
      const updatePayload = {
        orderStatus: 'cancelled',
        cancelledAt: new Date(),
        cancelReason: cancelReason || 'Khách hàng hủy đơn',
      };
      if (bill.paymentStatus === 'paid') updatePayload.paymentStatus = 'refunded';

      cancelledBill = await Bill.findOneAndUpdate(
        { _id: billId, orderStatus: { $nin: ['delivered', 'cancelled'] } },
        { $set: updatePayload },
        { new: true, session }
      );

      if (!cancelledBill) throw new Error('Không thể hủy đơn hàng đã giao hoặc đã hủy');
      await restoreStockItems(cancelledBill.items, cancelledBill._id, session);
    });

    return { status: 'OK', message: 'Hủy đơn hàng thành công', data: cancelledBill };
  } catch (error) {
    return { status: 'ERR', message: error.message || 'Hủy đơn hàng thất bại' };
  } finally {
    await session.endSession();
  }
};

const deleteBill = async (billId, actorUserId = null) => {
  if (!mongoose.isValidObjectId(billId)) return { status: 'ERR', message: 'Bill ID không hợp lệ' };

  const bill = await Bill.findById(billId);
  if (!bill) return { status: 'ERR', message: 'Hóa đơn không tồn tại' };
  if (bill.isDeleted) return { status: 'OK', message: 'Đơn hàng đã được ẩn trước đó' };

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const currentBill = await Bill.findById(billId).session(session);
      if (!currentBill) throw new Error('Hóa đơn không tồn tại');

      const shouldRestore = !['cancelled', 'delivered'].includes(currentBill.orderStatus);
      if (shouldRestore) {
        const claimedBill = await Bill.findOneAndUpdate(
          { _id: billId, orderStatus: { $nin: ['cancelled', 'delivered'] } },
          { $set: { orderStatus: 'cancelled' } },
          { new: true, session }
        );
        if (claimedBill) await restoreStockItems(claimedBill.items, claimedBill._id, session);
      }

      await Bill.updateOne(
        { _id: billId },
        { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: actorUserId || null } },
        { session }
      );
    });
  } catch (error) {
    if (error.message === 'Hóa đơn không tồn tại') return { status: 'ERR', message: error.message };
    return { status: 'ERR', message: 'Ẩn đơn hàng thất bại' };
  } finally {
    await session.endSession();
  }

  return { status: 'OK', message: 'Ẩn đơn hàng thành công' };
};

const confirmPaymentFromWebhook = async (payload = {}, signatureHeader = '', rawBody = '') => {
  if (!env.paymentWebhookSecret) {
    return { status: 'ERR', message: 'PAYMENT_WEBHOOK_SECRET chưa được cấu hình' };
  }
  if (!isValidPaymentWebhookSignature(payload, signatureHeader, rawBody)) {
    return { status: 'ERR', message: 'Chữ ký webhook không hợp lệ' };
  }

  const billId = payload.billId || payload.orderId || payload.bill_id;
  if (!mongoose.isValidObjectId(billId)) {
    return { status: 'ERR', message: 'billId không hợp lệ' };
  }

  const bill = await Bill.findById(billId);
  if (!bill || bill.isDeleted) return { status: 'ERR', message: 'Hóa đơn không tồn tại' };

  const normalizedStatus = normalizePaymentWebhookStatus(payload.status || payload.paymentStatus);
  if (!normalizedStatus) return { status: 'ERR', message: 'Trạng thái webhook không hợp lệ' };

  const providedAmount = Number(payload.amount);
  if (Number.isFinite(providedAmount) && providedAmount > 0) {
    const expectedAmount = Number(bill.tongtien || 0);
    if (Math.round(providedAmount) !== Math.round(expectedAmount)) {
      return { status: 'ERR', message: 'Số tiền thanh toán không khớp với đơn hàng' };
    }
  }

  if (normalizedStatus === 'failed') {
    bill.paymentGateway = {
      provider: String(payload.provider || bill.paymentMethod || ''),
      transactionId: String(payload.transactionId || payload.transaction_id || ''),
      rawStatus: String(payload.status || ''),
      confirmedAt: new Date(),
    };
    await bill.save();
    return { status: 'OK', message: 'Đã ghi nhận giao dịch thất bại', data: bill };
  }

  if (normalizedStatus === 'paid') {
    if (bill.orderStatus === 'cancelled') {
      return { status: 'ERR', message: 'Không thể xác nhận thanh toán cho đơn hàng đã hủy' };
    }
    if (bill.paymentStatus !== 'paid') {
      bill.paymentStatus = 'paid';
      bill.paidAt = bill.paidAt || new Date();
    }
  }

  if (normalizedStatus === 'refunded') {
    if (bill.paymentStatus !== 'paid') {
      return { status: 'ERR', message: 'Không thể hoàn tiền cho đơn chưa thanh toán' };
    }
    bill.paymentStatus = 'refunded';
  }

  bill.paymentGateway = {
    provider: String(payload.provider || bill.paymentMethod || ''),
    transactionId: String(payload.transactionId || payload.transaction_id || ''),
    rawStatus: String(payload.status || ''),
    confirmedAt: new Date(),
  };
  await bill.save();

  return { status: 'OK', message: 'Xác nhận thanh toán thành công', data: bill };
};

module.exports = {
  createBill,
  getAllBill,
  getDetailsBill,
  updateBillStatus,
  cancelBill,
  deleteBill,
  confirmPaymentFromWebhook,
};
