const mongoose = require('mongoose');
const Pet = require('../models/PetModel');
const { buildActiveOnlyFilter, isActiveRecord } = require('../utils/visibility');

const PET_MUTABLE_FIELDS = new Set([
    'name',
    'species',
    'breed',
    'gender',
    'birthday',
    'weightKg',
    'color',
    'avatar',
    'notes',
    'medicalNotes',
    'isActive',
]);

const pickPetUpdateFields = (payload = {}) =>
    Object.entries(payload).reduce((acc, [key, value]) => {
        if (PET_MUTABLE_FIELDS.has(key)) acc[key] = value;
        return acc;
    }, {});

const createPet = async (userId, payload) => {
    const { name, species } = payload;
    if (!name || !species) return { status: 'ERR', message: 'name và species là bắt buộc' };
    const created = await Pet.create({
        ...payload,
        userId,
        name: String(name).trim(),
    });
    return { status: 'OK', message: 'Tạo thú cưng thành công', data: created };
};

const updatePet = async (id, userId, isAdmin, payload) => {
    if (!mongoose.isValidObjectId(id)) return { status: 'ERR', message: 'Pet ID không hợp lệ' };
    const pet = await Pet.findById(id);
    if (!isActiveRecord(pet)) return { status: 'ERR', message: 'Thú cưng không tồn tại' };
    if (!isAdmin && String(pet.userId) !== String(userId)) return { status: 'ERR', message: 'Không có quyền cập nhật thú cưng này' };

    const updateData = pickPetUpdateFields(payload);
    if (!Object.keys(updateData).length) {
        return { status: 'ERR', message: 'Không có dữ liệu hợp lệ để cập nhật' };
    }

    if (updateData.name !== undefined) updateData.name = String(updateData.name).trim();
    if (updateData.weightKg !== undefined) updateData.weightKg = Number(updateData.weightKg);

    const updated = await Pet.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
    });
    return { status: 'OK', message: 'Cập nhật thú cưng thành công', data: updated };
};

const deletePet = async (id, userId, isAdmin) => {
    if (!mongoose.isValidObjectId(id)) return { status: 'ERR', message: 'Pet ID không hợp lệ' };
    const pet = await Pet.findById(id);
    if (!isActiveRecord(pet)) return { status: 'ERR', message: 'Thú cưng không tồn tại' };
    if (!isAdmin && String(pet.userId) !== String(userId)) return { status: 'ERR', message: 'Không có quyền xóa thú cưng này' };
    if (!pet.isActive) return { status: 'OK', message: 'Thú cưng đã được ẩn trước đó' };
    await Pet.findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true, runValidators: true });
    return { status: 'OK', message: 'Ẩn thú cưng thành công' };
};

const getPetDetail = async (id, userId, isAdmin) => {
    if (!mongoose.isValidObjectId(id)) return { status: 'ERR', message: 'Pet ID không hợp lệ' };
    const pet = await Pet.findById(id).lean();
    if (!pet || !pet.isActive) return { status: 'ERR', message: 'Thú cưng không tồn tại' };
    if (!isAdmin && String(pet.userId) !== String(userId)) return { status: 'ERR', message: 'Không có quyền xem thú cưng này' };
    return { status: 'OK', message: 'Thành công', data: pet };
};

const getMyPets = async (userId, query = {}) => {
    const filter = buildActiveOnlyFilter({ userId });
    const data = await Pet.find(filter).sort({ createdAt: -1 }).lean();
    return { status: 'OK', message: 'Thành công', data };
};

module.exports = {
    createPet,
    updatePet,
    deletePet,
    getPetDetail,
    getMyPets,
};
