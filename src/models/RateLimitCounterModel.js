const mongoose = require('mongoose');

const rateLimitCounterSchema = new mongoose.Schema(
    {
        scope: { type: String, required: true, trim: true },
        ip: { type: String, required: true, trim: true },
        windowStart: { type: Date, required: true },
        count: { type: Number, required: true, default: 0, min: 0 },
        expiresAt: { type: Date, required: true },
    },
    { timestamps: false }
);

rateLimitCounterSchema.index({ scope: 1, ip: 1, windowStart: 1 }, { unique: true });
rateLimitCounterSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RateLimitCounter', rateLimitCounterSchema);
