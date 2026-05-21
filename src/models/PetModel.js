const mongoose = require('mongoose');

const petSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    species: { type: String, enum: ['dog', 'cat', 'other'], required: true },
    breed: { type: String, default: '', trim: true },
    gender: { type: String, enum: ['male', 'female', 'unknown'], default: 'unknown' },
    birthday: { type: Date, default: null },
    weightKg: { type: Number, default: 0, min: 0 },
    color: { type: String, default: '', trim: true },
    avatar: { type: String, default: '' },
    notes: { type: String, default: '' },
    medicalNotes: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

petSchema.index({ userId: 1, isActive: 1, createdAt: -1 });
petSchema.index({ species: 1, breed: 1 });

module.exports = mongoose.model('Pet', petSchema);
