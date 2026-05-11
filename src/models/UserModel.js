const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        name: { type: String },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true, select: false },
        isAdmin: { type: Boolean, default: false },
        phone: { type: String },
        address: { type: String },
        avatar: { type: String },
    },
    {
        timestamps: true,
    }
);

const User = mongoose.model("User", userSchema);
module.exports = User;
