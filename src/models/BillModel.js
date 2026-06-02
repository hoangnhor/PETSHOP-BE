const mongoose = require('mongoose');

const billSchema = new mongoose.Schema(
    {
        orderCode: { type: String, trim: true, uppercase: true, unique: true, sparse: true },
        iduser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        items: [
            {
                idsp: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
                name: { type: String, required: true },
                image: { type: String, default: '' },
                price: { type: Number, required: true },
                discount: { type: Number, default: 0 },
                quantity: { type: Number, required: true, min: 1 },
                subtotal: { type: Number, required: true },
            },
        ],
        shippingAddress: {
            fullName: { type: String, required: true },
            phone: { type: String, required: true },
            address: { type: String, required: true },
            city: { type: String, default: '' },
        },
        paymentMethod: {
            type: String,
            enum: ['COD', 'BANKING', 'MOMO', 'VNPAY'],
            default: 'COD',
        },
        paymentStatus: {
            type: String,
            enum: ['unpaid', 'paid', 'refunded'],
            default: 'unpaid',
        },
        orderStatus: {
            type: String,
            enum: ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'],
            default: 'pending',
        },
        tongtien: { type: Number, required: true },
        pricing: {
            subTotal: { type: Number, default: 0, min: 0 },
            discountTotal: { type: Number, default: 0, min: 0 },
            shippingFee: { type: Number, default: 0, min: 0 },
            taxTotal: { type: Number, default: 0, min: 0 },
            grandTotal: { type: Number, default: 0, min: 0 },
            currency: { type: String, default: 'VND' },
        },
        note: { type: String, default: '' },
        paidAt: { type: Date, default: null },
        paymentGateway: {
            provider: { type: String, default: '' },
            transactionId: { type: String, default: '' },
            rawStatus: { type: String, default: '' },
            confirmedAt: { type: Date, default: null },
        },
        shippedAt: { type: Date, default: null },
        deliveredAt: { type: Date, default: null },
        cancelledAt: { type: Date, default: null },
        cancelReason: { type: String, default: '' },
        shipment: {
            carrier: { type: String, default: '' },
            trackingNumber: { type: String, default: '' },
            shippingStatus: {
                type: String,
                enum: ['pending', 'picked', 'in_transit', 'delivered', 'returned'],
                default: 'pending',
            },
        },
        coupon: {
            code: { type: String, default: '', trim: true, uppercase: true },
            discountAmount: { type: Number, default: 0, min: 0 },
        },
        isDeleted: { type: Boolean, default: false },
        deletedAt: { type: Date, default: null },
        deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    },
    {
        timestamps: true,
    }
);

billSchema.path('items').validate(function (items) {
    return Array.isArray(items) && items.length > 0;
}, 'Đơn hàng phải có ít nhất 1 sản phẩm');

billSchema.pre('validate', function (next) {
    const total = Number(this.tongtien || 0);
    if (!this.pricing) this.pricing = {};
    if (!Number.isFinite(this.pricing.grandTotal) || this.pricing.grandTotal < 0) {
        this.pricing.grandTotal = total;
    }
    if (total <= 0 && Number(this.pricing.grandTotal || 0) > 0) {
        this.tongtien = Number(this.pricing.grandTotal);
    } else {
        this.pricing.grandTotal = total;
    }
    next();
});

billSchema.index({ iduser: 1, createdAt: -1 });
billSchema.index({ iduser: 1, 'coupon.code': 1, isDeleted: 1, createdAt: -1 });
billSchema.index({ orderStatus: 1, createdAt: -1 });
billSchema.index({ paymentStatus: 1, createdAt: -1 });
billSchema.index({ isDeleted: 1, createdAt: -1 });

const Bill = mongoose.model('Bill', billSchema);
module.exports = Bill;

