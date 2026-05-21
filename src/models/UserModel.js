const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        name: { type: String, trim: true, default: '' },
        email: { type: String, required: true, unique: true, trim: true, lowercase: true },
        password: { type: String, required: true, select: false },
        isAdmin: { type: Boolean, default: false },
        phone: { type: String, trim: true, default: '' },
        address: { type: String, trim: true, default: '' },
        avatar: { type: String, default: '' },
        status: { type: String, enum: ['active', 'blocked'], default: 'active' },
        addresses: [
            {
                fullName: { type: String, default: '' },
                phone: { type: String, default: '' },
                email: { type: String, default: '' },
                line1: { type: String, required: true, trim: true },
                line2: { type: String, default: '' },
                ward: { type: String, default: '' },
                district: { type: String, default: '' },
                city: { type: String, default: '' },
                country: { type: String, default: 'Việt Nam' },
                postalCode: { type: String, default: '' },
                isDefaultShipping: { type: Boolean, default: false },
                isDefaultBilling: { type: Boolean, default: false },
            },
        ],
        lastLoginAt: { type: Date, default: null },
    },
    {
        timestamps: true,
    }
);

userSchema.index({ status: 1, createdAt: -1 });

const User = mongoose.model("User", userSchema);
module.exports = User;
