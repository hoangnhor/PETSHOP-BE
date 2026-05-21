const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    category: { type: String, enum: ['grooming', 'spa', 'medical-basic', 'combo'], default: 'grooming' },
    description: { type: String, default: '' },
    species: { type: String, enum: ['dog', 'cat', 'all'], default: 'all' },
    durationMin: { type: Number, required: true, min: 10 },
    price: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, default: 0, min: 0 },
    image: { type: String, default: '' },
    includes: [{ type: String, default: '' }],
    exclusions: [{ type: String, default: '' }],
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

serviceSchema.index({ isActive: 1, sortOrder: 1 });
serviceSchema.index({ species: 1, isActive: 1 });

serviceSchema.pre('validate', function (next) {
  if (Number(this.salePrice || 0) > Number(this.price || 0)) {
    return next(new Error('salePrice không được lớn hơn price'));
  }
  return next();
});

module.exports = mongoose.model('Service', serviceSchema);
