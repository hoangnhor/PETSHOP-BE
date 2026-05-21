const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema(
    {
        sku: { type: String, trim: true, uppercase: true, unique: true, sparse: true },
        slug: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
        name: { type: String, required: true, trim: true },
        image: { type: String, required: false, default: '' },
        images: [{ type: String, default: '' }],
        thumb: { type: String, default: '' },
        type: { type: mongoose.Schema.Types.ObjectId, ref: 'Type', required: true },
        species: { type: String, enum: ['dog', 'cat', 'all'], default: 'all' },
        brand: { type: String, default: '' },
        price: { type: Number, required: true, min: 0 },
        countInStock: { type: Number, required: true, min: 0 },
        description: { type: String, required: false, default: '' },
        shortDescription: { type: String, default: '' },
        discount: { type: Number, default: 0, min: 0, max: 100 },
        selled: { type: Number, default: 0, min: 0 },
        attributes: { type: Object, default: {} },
        isActive: { type: Boolean, default: true },
        isFeatured: { type: Boolean, default: false },
        publishedAt: { type: Date, default: null },
    },
    {
        timestamps: true,
    }
);

ProductSchema.index({ type: 1, createdAt: -1 });
ProductSchema.index({ createdAt: -1 });
ProductSchema.index({ species: 1, isActive: 1, createdAt: -1 });
ProductSchema.index({ isActive: 1, isFeatured: 1, createdAt: -1 });
ProductSchema.index({ name: 'text', description: 'text' });

const Product = mongoose.model('Product', ProductSchema);
module.exports = Product;
