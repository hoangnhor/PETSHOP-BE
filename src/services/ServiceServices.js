const mongoose = require('mongoose');
const Service = require('../models/ServiceModel');

const normalizeText = (value = '') => String(value || '').trim();

const validatePayload = (payload, isCreate = true) => {
    const required = ['code', 'name', 'slug', 'durationMin', 'price'];
    if (isCreate) {
        for (const field of required) {
            if (payload[field] === undefined || payload[field] === null || payload[field] === '') {
                return `${field} là bắt buộc`;
            }
        }
    }
    if (payload.durationMin !== undefined && (!Number.isFinite(Number(payload.durationMin)) || Number(payload.durationMin) < 10)) return 'durationMin không hợp lệ';
    if (payload.price !== undefined && (!Number.isFinite(Number(payload.price)) || Number(payload.price) < 0)) return 'price không hợp lệ';
    if (payload.salePrice !== undefined && (!Number.isFinite(Number(payload.salePrice)) || Number(payload.salePrice) < 0)) return 'salePrice không hợp lệ';
    if (payload.salePrice !== undefined && payload.price !== undefined && Number(payload.salePrice) > Number(payload.price)) return 'salePrice không được lớn hơn price';
    return null;
};

const createService = async (payload) => {
    const message = validatePayload(payload, true);
    if (message) return { status: 'ERR', message };
    const code = normalizeText(payload.code).toUpperCase();
    const slug = normalizeText(payload.slug).toLowerCase();
    const name = normalizeText(payload.name);
    if (!code || !slug || !name) return { status: 'ERR', message: 'code, slug, name là bắt buộc' };

    const duplicated = await Service.findOne({ $or: [{ code }, { slug }] });
    if (duplicated) return { status: 'ERR', message: 'code hoặc slug đã tồn tại' };

    const created = await Service.create({
        ...payload,
        code,
        slug,
        name,
        durationMin: Number(payload.durationMin),
        price: Number(payload.price),
        salePrice: Number(payload.salePrice || 0),
    });
    return { status: 'OK', message: 'Tạo dịch vụ thành công', data: created };
};

const updateService = async (id, payload) => {
    if (!mongoose.isValidObjectId(id)) return { status: 'ERR', message: 'Service ID không hợp lệ' };
    const message = validatePayload(payload, false);
    if (message) return { status: 'ERR', message };

    const service = await Service.findById(id);
    if (!service) return { status: 'ERR', message: 'Dịch vụ không tồn tại' };

    const updateData = { ...payload };
    if (updateData.code) updateData.code = normalizeText(updateData.code).toUpperCase();
    if (updateData.slug) updateData.slug = normalizeText(updateData.slug).toLowerCase();
    if (updateData.name) updateData.name = normalizeText(updateData.name);
    if (updateData.durationMin !== undefined) updateData.durationMin = Number(updateData.durationMin);
    if (updateData.price !== undefined) updateData.price = Number(updateData.price);
    if (updateData.salePrice !== undefined) updateData.salePrice = Number(updateData.salePrice);

    if (updateData.code || updateData.slug) {
        const check = await Service.findOne({
            _id: { $ne: id },
            $or: [{ code: updateData.code || service.code }, { slug: updateData.slug || service.slug }],
        });
        if (check) return { status: 'ERR', message: 'code hoặc slug đã tồn tại' };
    }

    const updated = await Service.findByIdAndUpdate(id, updateData, { new: true });
    return { status: 'OK', message: 'Cập nhật dịch vụ thành công', data: updated };
};

const deleteService = async (id) => {
    if (!mongoose.isValidObjectId(id)) return { status: 'ERR', message: 'Service ID không hợp lệ' };
    const deleted = await Service.findByIdAndDelete(id);
    if (!deleted) return { status: 'ERR', message: 'Dịch vụ không tồn tại' };
    return { status: 'OK', message: 'Xóa dịch vụ thành công' };
};

const getServiceDetail = async (id) => {
    if (!mongoose.isValidObjectId(id)) return { status: 'ERR', message: 'Service ID không hợp lệ' };
    const service = await Service.findById(id).lean();
    if (!service) return { status: 'ERR', message: 'Dịch vụ không tồn tại' };
    return { status: 'OK', message: 'Thành công', data: service };
};

const getServiceDetailBySlug = async (slug) => {
    const normalizedSlug = normalizeText(slug).toLowerCase();
    if (!normalizedSlug) return { status: 'ERR', message: 'slug là bắt buộc' };
    const service = await Service.findOne({ slug: normalizedSlug }).lean();
    if (!service) return { status: 'ERR', message: 'Dịch vụ không tồn tại' };
    return { status: 'OK', message: 'Thành công', data: service };
};

const getAllServices = async (query = {}) => {
    const filter = {};
    if (query.isActive !== undefined) filter.isActive = String(query.isActive) === 'true';
    if (query.species) filter.species = query.species;
    if (query.category) filter.category = query.category;
    if (query.keyword) filter.name = { $regex: query.keyword, $options: 'i' };
    const limit = Math.min(Math.max(parseInt(query.limit) || 50, 1), 200);
    const page = Math.max(parseInt(query.page) || 0, 0);
    const total = await Service.countDocuments(filter);
    const data = await Service.find(filter).sort({ sortOrder: 1, createdAt: -1 }).skip(page * limit).limit(limit).lean();
    return { status: 'OK', message: 'Thành công', data, total, pageCurrent: page + 1, totalPage: Math.ceil(total / limit) };
};

module.exports = {
    createService,
    updateService,
    deleteService,
    getServiceDetail,
    getServiceDetailBySlug,
    getAllServices,
};
