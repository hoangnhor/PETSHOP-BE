const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, unique: true },
        image: { type: String, required: false },
        type: { type: mongoose.Schema.Types.ObjectId, ref: 'Type', required: true },
        price: { type: Number, required: true },
        countInStock: { type: Number, required: true },
        description: { type: String, required: false },
        discount: { type: Number, default: 0 },
        selled: { type: Number, default: 0 },
    },
    {
        timestamps: true,
    }
);

ProductSchema.index({ type: 1, createdAt: -1 });
ProductSchema.index({ createdAt: -1 });
ProductSchema.index({ name: 'text', description: 'text' });

const Product = mongoose.model('Product', ProductSchema);
module.exports = Product;
