const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    appointmentCode: { type: String, required: true, unique: true, trim: true, uppercase: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    petId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet', required: true },
    serviceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true }],
    bookingChannel: { type: String, enum: ['web', 'admin', 'phone'], default: 'web' },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'checked_in', 'in_service', 'completed', 'cancelled', 'no_show'],
      default: 'pending',
    },
    scheduleAt: { type: Date, required: true },
    durationMin: { type: Number, required: true, min: 10 },
    endAt: { type: Date, required: true },
    branchName: { type: String, default: '', trim: true },
    staffName: { type: String, default: '', trim: true },
    customerNote: { type: String, default: '' },
    internalNote: { type: String, default: '' },
    pricing: {
      subTotal: { type: Number, required: true, min: 0 },
      discountTotal: { type: Number, default: 0, min: 0 },
      finalTotal: { type: Number, required: true, min: 0 },
      paymentStatus: { type: String, enum: ['unpaid', 'paid', 'refunded'], default: 'unpaid' },
      paymentMethod: { type: String, enum: ['cash', 'card', 'banking', 'momo', 'vnpay'], default: 'cash' },
    },
    cancelledAt: { type: Date, default: null },
    cancelReason: { type: String, default: '' },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

appointmentSchema.path('serviceIds').validate(function (serviceIds) {
  return Array.isArray(serviceIds) && serviceIds.length > 0;
}, 'Lịch hẹn phải có ít nhất 1 dịch vụ');

appointmentSchema.pre('validate', function (next) {
  if (this.scheduleAt && this.endAt && this.endAt <= this.scheduleAt) {
    return next(new Error('Thời gian kết thúc phải lớn hơn thời gian bắt đầu'));
  }
  return next();
});

appointmentSchema.pre('save', async function (next) {
  const activeStatuses = ['pending', 'confirmed', 'checked_in', 'in_service'];
  if (!this.petId || !this.scheduleAt || !this.endAt || !activeStatuses.includes(this.status)) return next();

  const conflict = await this.constructor.findOne({
    _id: { $ne: this._id },
    petId: this.petId,
    status: { $in: activeStatuses },
    scheduleAt: { $lt: this.endAt },
    endAt: { $gt: this.scheduleAt },
  }).lean();

  if (conflict) {
    return next(new Error('Thú cưng đã có lịch hẹn trùng thời gian'));
  }
  return next();
});

appointmentSchema.pre('findOneAndUpdate', async function (next) {
  this.setOptions({ runValidators: true, context: 'query' });

  const activeStatuses = ['pending', 'confirmed', 'checked_in', 'in_service'];
  const update = this.getUpdate() || {};
  const setData = update.$set || {};

  const current = await this.model.findOne(this.getQuery()).lean();
  if (!current) return next();

  const merged = {
    ...current,
    ...setData,
  };

  if (merged.scheduleAt && merged.endAt && new Date(merged.endAt) <= new Date(merged.scheduleAt)) {
    return next(new Error('Thời gian kết thúc phải lớn hơn thời gian bắt đầu'));
  }

  if (!merged.petId || !merged.scheduleAt || !merged.endAt || !activeStatuses.includes(merged.status)) {
    return next();
  }

  const conflict = await this.model.findOne({
    _id: { $ne: current._id },
    petId: merged.petId,
    status: { $in: activeStatuses },
    scheduleAt: { $lt: merged.endAt },
    endAt: { $gt: merged.scheduleAt },
  }).lean();

  if (conflict) {
    return next(new Error('Thú cưng đã có lịch hẹn trùng thời gian'));
  }

  return next();
});

appointmentSchema.index({ userId: 1, scheduleAt: -1 });
appointmentSchema.index({ petId: 1, scheduleAt: -1 });
appointmentSchema.index({ status: 1, scheduleAt: 1 });
appointmentSchema.index({ scheduleAt: 1, endAt: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
