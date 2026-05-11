const mongoose = require('mongoose');

const billSchema = new mongoose.Schema(
    {
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
        note: { type: String, default: '' },
        paidAt: { type: Date, default: null },
        deliveredAt: { type: Date, default: null },
        cancelledAt: { type: Date, default: null },
        cancelReason: { type: String, default: '' },
    },
    {
        timestamps: true,
    }
);

const Bill = mongoose.model('Bill', billSchema);
module.exports = Bill;
