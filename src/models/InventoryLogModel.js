const mongoose = require('mongoose');

const inventoryLogSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    type: { type: String, enum: ['in', 'out', 'adjust', 'reserve', 'release'], required: true },
    quantity: { type: Number, required: true, min: 1 },
    stockAfter: { type: Number, required: true, min: 0 },
    reason: { type: String, default: '' },
    billId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bill', default: null },
    metadata: { type: Object, default: {} },
  },
  { timestamps: true }
);

inventoryLogSchema.index({ productId: 1, createdAt: -1 });
inventoryLogSchema.index({ type: 1, createdAt: -1 });

inventoryLogSchema.pre('validate', function (next) {
  if (!Number.isFinite(this.quantity) || this.quantity <= 0) {
    return next(new Error('Số lượng tồn kho phải lớn hơn 0'));
  }
  return next();
});

module.exports = mongoose.model('InventoryLog', inventoryLogSchema);
