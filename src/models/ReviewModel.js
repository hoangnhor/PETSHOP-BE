const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    billId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bill', default: null },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, default: '', trim: true },
    content: { type: String, default: '', trim: true },
    images: [{ type: String, default: '' }],
    isVerifiedPurchase: { type: Boolean, default: false },
    isVisible: { type: Boolean, default: true },
  },
  { timestamps: true }
);

reviewSchema.index({ productId: 1, isVisible: 1, createdAt: -1 });
reviewSchema.index({ userId: 1, createdAt: -1 });
reviewSchema.index(
  { productId: 1, userId: 1, billId: 1 },
  { unique: true, partialFilterExpression: { billId: { $type: 'objectId' } } }
);

module.exports = mongoose.model('Review', reviewSchema);
