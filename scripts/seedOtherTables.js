const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const User = require('../src/models/UserModel');
const Pet = require('../src/models/PetModel');
const Service = require('../src/models/ServiceModel');
const Coupon = require('../src/models/CouponModel');
const Cart = require('../src/models/CartModel');
const Wishlist = require('../src/models/WishlistModel');
const Bill = require('../src/models/BillModel');
const Review = require('../src/models/ReviewModel');
const Appointment = require('../src/models/AppointmentModel');
const InventoryLog = require('../src/models/InventoryLogModel');
const Product = require('../src/models/ProductModel');

async function upsertUser({ email, ...data }) {
  const existing = await User.findOne({ email }).lean();
  if (existing?._id) {
    await User.updateOne({ _id: existing._id }, { $set: data });
    return existing._id;
  }
  const created = await User.create({ email, ...data });
  return created._id;
}

async function run() {
  const uri = process.env.MONGODB_URL;
  if (!uri) throw new Error('Thiếu MONGODB_URL trong BE/.env');
  await mongoose.connect(uri);

  const passwordHash = await bcrypt.hash('123456', 10);

  const adminUserId = await upsertUser({
    email: 'admin@petshop.local',
    name: 'Admin Petshop',
    password: passwordHash,
    isAdmin: true,
    phone: '0909000001',
    address: 'Quận 1, TP.HCM',
    status: 'active',
  });

  const customerUserId = await upsertUser({
    email: 'customer@petshop.local',
    name: 'Khách Hàng Mẫu',
    password: passwordHash,
    isAdmin: false,
    phone: '0909000002',
    address: 'Thủ Đức, TP.HCM',
    status: 'active',
  });

  const services = [
    {
      code: 'GRM-BASIC',
      name: 'Tắm Grooming Cơ Bản',
      slug: 'tam-grooming-co-ban',
      category: 'grooming',
      species: 'dog',
      durationMin: 60,
      price: 180000,
      salePrice: 150000,
      description: 'Tắm, sấy và vệ sinh tai cơ bản cho chó.',
      includes: ['Tắm', 'Sấy', 'Vệ sinh tai'],
      isActive: true,
      sortOrder: 1,
    },
    {
      code: 'SPA-RELAX',
      name: 'Spa Thư Giãn',
      slug: 'spa-thu-gian',
      category: 'spa',
      species: 'all',
      durationMin: 75,
      price: 250000,
      salePrice: 0,
      description: 'Massage nhẹ và dưỡng lông chuyên sâu.',
      includes: ['Massage', 'Dưỡng lông'],
      isActive: true,
      sortOrder: 2,
    },
  ];

  for (const item of services) {
    await Service.updateOne({ code: item.code }, { $set: item }, { upsert: true });
  }

  const coupons = [
    {
      code: 'WELCOME10',
      name: 'Giảm 10% đơn đầu',
      description: 'Áp dụng cho khách hàng mới.',
      discountType: 'percent',
      discountValue: 10,
      minOrderValue: 200000,
      maxDiscountValue: 50000,
      usageLimit: 1000,
      perUserLimit: 1,
      startsAt: new Date('2026-01-01T00:00:00.000Z'),
      endsAt: new Date('2026-12-31T23:59:59.000Z'),
      isActive: true,
    },
    {
      code: 'SHIPFREE30',
      name: 'Giảm 30k phí vận chuyển',
      description: 'Giảm cố định cho đơn từ 300k.',
      discountType: 'fixed',
      discountValue: 30000,
      minOrderValue: 300000,
      maxDiscountValue: 30000,
      usageLimit: 500,
      perUserLimit: 2,
      startsAt: new Date('2026-01-01T00:00:00.000Z'),
      endsAt: new Date('2026-12-31T23:59:59.000Z'),
      isActive: true,
    },
  ];

  for (const item of coupons) {
    await Coupon.updateOne({ code: item.code }, { $set: item }, { upsert: true });
  }

  const customerPet = await Pet.findOneAndUpdate(
    { userId: customerUserId, name: 'Milu' },
    {
      $set: {
        species: 'dog',
        breed: 'Poodle',
        gender: 'female',
        weightKg: 4.2,
        color: 'Trắng',
        notes: 'Hiền, dễ hợp tác khi grooming.',
        isActive: true,
      },
    },
    { upsert: true, new: true }
  );

  const products = await Product.find({ isActive: true }).sort({ createdAt: 1 }).limit(3).lean();
  if (products.length < 2) throw new Error('Cần ít nhất 2 sản phẩm để seed các bảng còn lại');

  const cartItems = products.slice(0, 2).map((p, idx) => ({
    productId: p._id,
    sku: p.sku || '',
    name: p.name,
    image: p.image || '',
    price: p.price,
    discount: p.discount || 0,
    quantity: idx + 1,
  }));

  await Cart.findOneAndUpdate(
    { userId: customerUserId },
    { $set: { items: cartItems, couponCode: 'WELCOME10', note: 'Giỏ hàng mẫu' } },
    { upsert: true, new: true }
  );

  await Wishlist.findOneAndUpdate(
    { userId: customerUserId },
    { $set: { productIds: products.map((p) => p._id) } },
    { upsert: true, new: true }
  );

  const billItems = cartItems.map((item) => ({
    idsp: item.productId,
    name: item.name,
    image: item.image,
    price: item.price,
    discount: item.discount,
    quantity: item.quantity,
    subtotal: Math.round(item.price * item.quantity * (1 - (item.discount || 0) / 100)),
  }));

  const subTotal = billItems.reduce((sum, i) => sum + i.subtotal, 0);
  const shippingFee = 20000;
  const discountTotal = 30000;
  const grandTotal = Math.max(0, subTotal + shippingFee - discountTotal);

  const bill = await Bill.findOneAndUpdate(
    { orderCode: 'ORD-SAMPLE-0001' },
    {
      $set: {
        iduser: customerUserId,
        items: billItems,
        shippingAddress: {
          fullName: 'Khách Hàng Mẫu',
          phone: '0909000002',
          address: '123 Xa Lộ Hà Nội, Thủ Đức',
          city: 'TP.HCM',
        },
        paymentMethod: 'COD',
        paymentStatus: 'unpaid',
        orderStatus: 'pending',
        tongtien: grandTotal,
        pricing: {
          subTotal,
          discountTotal,
          shippingFee,
          taxTotal: 0,
          grandTotal,
          currency: 'VND',
        },
        note: 'Đơn hàng mẫu để test hệ thống.',
      },
    },
    { upsert: true, new: true }
  );

  await Review.findOneAndUpdate(
    { productId: products[0]._id, userId: customerUserId, billId: bill._id },
    {
      $set: {
        rating: 5,
        title: 'Sản phẩm tốt',
        content: 'Đóng gói ổn, chó nhà mình dùng hợp.',
        isVerifiedPurchase: true,
        isVisible: true,
      },
    },
    { upsert: true, new: true }
  );

  const serviceDocs = await Service.find({ isActive: true }).sort({ sortOrder: 1 }).limit(2).lean();
  if (serviceDocs.length === 0) throw new Error('Không có dịch vụ để tạo lịch hẹn mẫu');

  const durationMin = serviceDocs.reduce((sum, s) => sum + Number(s.durationMin || 0), 0);
  const finalTotal = serviceDocs.reduce((sum, s) => sum + Number(s.salePrice > 0 ? s.salePrice : s.price), 0);
  const scheduleAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const endAt = new Date(scheduleAt.getTime() + durationMin * 60 * 1000);

  await Appointment.findOneAndUpdate(
    { appointmentCode: 'APT-SAMPLE-0001' },
    {
      $set: {
        userId: customerUserId,
        petId: customerPet._id,
        serviceIds: serviceDocs.map((s) => s._id),
        bookingChannel: 'web',
        status: 'confirmed',
        scheduleAt,
        durationMin,
        endAt,
        branchName: 'Petshop Thủ Đức',
        staffName: 'KTV Lan',
        customerNote: 'Xin gọi trước 15 phút.',
        pricing: {
          subTotal: finalTotal,
          discountTotal: 0,
          finalTotal,
          paymentStatus: 'unpaid',
          paymentMethod: 'cash',
        },
      },
    },
    { upsert: true, new: true }
  );

  const firstProduct = products[0];
  const stockAfter = Math.max(0, Number(firstProduct.countInStock || 0) - 1);
  await InventoryLog.findOneAndUpdate(
    { productId: firstProduct._id, reason: 'Seed order sample' },
    {
      $set: {
        type: 'out',
        quantity: 1,
        stockAfter,
        billId: bill._id,
        metadata: { source: 'seedOtherTables' },
      },
    },
    { upsert: true, new: true }
  );

  console.log('Seeded: users, pets, services, coupons, carts, wishlists, bills, reviews, appointments, inventory_logs');
}

run()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
