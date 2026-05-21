const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    sku: { type: String, trim: true, uppercase: true, default: '' },
    name: { type: String, required: true, trim: true },
    image: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0, max: 100 },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: { type: [cartItemSchema], default: [] },
    couponCode: { type: String, trim: true, uppercase: true, default: '' },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

cartSchema.path('items').validate(function (items) {
  if (!Array.isArray(items)) return false;
  const ids = items.map((item) => String(item.productId));
  return new Set(ids).size === ids.length;
}, 'Giỏ hàng không được chứa sản phẩm trùng lặp');

cartSchema.pre('findOneAndUpdate', function (next) {
  this.setOptions({ runValidators: true, context: 'query' });
  const update = this.getUpdate() || {};
  const normalizeItems = (items) => {
    if (!Array.isArray(items)) return items;
    const map = new Map();
    for (const item of items) {
      if (!item?.productId) continue;
      const key = String(item.productId);
      if (!map.has(key)) map.set(key, item);
    }
    return [...map.values()];
  };

  if (Array.isArray(update.items)) {
    update.items = normalizeItems(update.items);
  }
  if (update.$set && Array.isArray(update.$set.items)) {
    update.$set.items = normalizeItems(update.$set.items);
  }

  this.setUpdate(update);
  next();
});

cartSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('Cart', cartSchema);
