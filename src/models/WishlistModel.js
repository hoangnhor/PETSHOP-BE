const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  },
  { timestamps: true }
);

wishlistSchema.pre('save', function (next) {
  if (Array.isArray(this.productIds)) {
    const unique = [...new Set(this.productIds.map((id) => String(id)))];
    if (!unique.every((id) => mongoose.Types.ObjectId.isValid(id))) {
      return next(new Error('Danh sách sản phẩm yêu thích không hợp lệ'));
    }
    this.productIds = unique.map((id) => new mongoose.Types.ObjectId(id));
  }
  next();
});

wishlistSchema.pre('findOneAndUpdate', function (next) {
  this.setOptions({ runValidators: true, context: 'query' });
  const update = this.getUpdate() || {};
  if (Array.isArray(update.productIds)) {
    const unique = [...new Set(update.productIds.map((id) => String(id)))];
    if (!unique.every((id) => mongoose.Types.ObjectId.isValid(id))) {
      return next(new Error('Danh sách sản phẩm yêu thích không hợp lệ'));
    }
    update.productIds = unique.map((id) => new mongoose.Types.ObjectId(id));
  }
  if (update.$set && Array.isArray(update.$set.productIds)) {
    const unique = [...new Set(update.$set.productIds.map((id) => String(id)))];
    if (!unique.every((id) => mongoose.Types.ObjectId.isValid(id))) {
      return next(new Error('Danh sách sản phẩm yêu thích không hợp lệ'));
    }
    update.$set.productIds = unique.map((id) => new mongoose.Types.ObjectId(id));
  }
  this.setUpdate(update);
  next();
});

wishlistSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('Wishlist', wishlistSchema);
