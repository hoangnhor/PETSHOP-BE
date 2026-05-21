const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    discountType: { type: String, enum: ['percent', 'fixed'], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    minOrderValue: { type: Number, default: 0, min: 0 },
    maxDiscountValue: { type: Number, default: 0, min: 0 },
    usageLimit: { type: Number, default: 0, min: 0 },
    usedCount: { type: Number, default: 0, min: 0 },
    perUserLimit: { type: Number, default: 1, min: 1 },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

couponSchema.index({ isActive: 1, startsAt: 1, endsAt: 1 });

couponSchema.pre('validate', function (next) {
  if (this.startsAt && this.endsAt && this.endsAt < this.startsAt) {
    return next(new Error('Thời gian kết thúc phải lớn hơn hoặc bằng thời gian bắt đầu'));
  }

  if (this.discountType === 'percent' && this.discountValue > 100) {
    return next(new Error('Mã giảm theo phần trăm không được vượt quá 100%'));
  }

  if (this.discountType === 'fixed' && this.maxDiscountValue > 0 && this.maxDiscountValue < this.discountValue) {
    return next(new Error('Giảm tối đa không được nhỏ hơn giá trị giảm cố định'));
  }

  if (this.usageLimit > 0 && this.usedCount > this.usageLimit) {
    return next(new Error('usedCount không được lớn hơn usageLimit'));
  }

  return next();
});

module.exports = mongoose.model('Coupon', couponSchema);
