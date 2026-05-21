const mongoose = require('mongoose');

const typeSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, unique: true },
        slug: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
        description: { type: String, default: '' },
        species: { type: String, enum: ['dog', 'cat', 'all'], default: 'all' },
        level: { type: Number, min: 1, max: 3, default: 1 },
        parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Type', default: null },
        sortOrder: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
        // Danh mục con cấp 3 để bạn import nhanh ngày mai (không bắt buộc dùng ngay)
        items: [
            {
                name: { type: String, required: true, trim: true },
                slug: { type: String, trim: true, lowercase: true },
                keywords: [{ type: String, trim: true, lowercase: true }],
                sortOrder: { type: Number, default: 0 },
                isActive: { type: Boolean, default: true },
            },
        ],
        metadata: { type: Object, default: {} },
    },
    {
        timestamps: true,
    }
);

typeSchema.index({ species: 1, level: 1, sortOrder: 1 });
typeSchema.index({ parentId: 1, sortOrder: 1 });

typeSchema.pre('validate', function (next) {
    if (!Array.isArray(this.items)) return next();

    const slugs = this.items
        .map((item) => (item?.slug || '').trim().toLowerCase())
        .filter(Boolean);

    if (new Set(slugs).size !== slugs.length) {
        return next(new Error('Danh sách items có slug bị trùng'));
    }

    return next();
});

const Type = mongoose.model('Type', typeSchema);
module.exports = Type;
