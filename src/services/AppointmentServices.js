const mongoose = require('mongoose');
const Appointment = require('../models/AppointmentModel');
const Pet = require('../models/PetModel');
const Service = require('../models/ServiceModel');

const ACTIVE_STATUSES = ['pending', 'confirmed', 'checked_in', 'in_service'];

const computePricing = (services = []) => {
    const subTotal = services.reduce((sum, service) => {
        const salePrice = Number(service.salePrice || 0);
        const price = Number(service.price || 0);
        return sum + (salePrice > 0 ? salePrice : price);
    }, 0);
    return { subTotal, discountTotal: 0, finalTotal: subTotal };
};

const checkConflict = async ({ petId, scheduleAt, endAt, excludedId = null }) => {
    const conflict = await Appointment.findOne({
        _id: excludedId ? { $ne: excludedId } : { $exists: true },
        petId,
        status: { $in: ACTIVE_STATUSES },
        scheduleAt: { $lt: endAt },
        endAt: { $gt: scheduleAt },
    }).lean();
    return Boolean(conflict);
};

const createAppointment = async (userId, payload, isAdmin = false) => {
    const { petId, serviceIds, scheduleAt, branchName = '', staffName = '', customerNote = '' } = payload;
    if (!petId || !Array.isArray(serviceIds) || !serviceIds.length || !scheduleAt) {
        return { status: 'ERR', message: 'petId, serviceIds, scheduleAt là bắt buộc' };
    }
    if (!mongoose.isValidObjectId(petId) || !serviceIds.every((id) => mongoose.isValidObjectId(id))) {
        return { status: 'ERR', message: 'petId hoặc serviceIds không hợp lệ' };
    }
    const pet = await Pet.findById(petId).lean();
    if (!pet) return { status: 'ERR', message: 'Thú cưng không tồn tại' };
    if (!isAdmin && String(pet.userId) !== String(userId)) return { status: 'ERR', message: 'Bạn không có quyền đặt lịch cho thú cưng này' };

    const services = await Service.find({ _id: { $in: serviceIds }, isActive: true }).lean();
    if (services.length !== new Set(serviceIds.map(String)).size) return { status: 'ERR', message: 'Danh sách dịch vụ không hợp lệ' };

    const totalDuration = services.reduce((sum, service) => sum + Number(service.durationMin || 0), 0);
    const start = new Date(scheduleAt);
    if (Number.isNaN(start.getTime())) return { status: 'ERR', message: 'scheduleAt không hợp lệ' };
    const end = new Date(start.getTime() + totalDuration * 60 * 1000);
    if (await checkConflict({ petId, scheduleAt: start, endAt: end })) return { status: 'ERR', message: 'Thú cưng đã có lịch hẹn trùng thời gian' };

    const pricing = computePricing(services);
    const created = await Appointment.create({
        appointmentCode: `APT${Date.now()}`,
        userId: pet.userId,
        petId,
        serviceIds,
        scheduleAt: start,
        durationMin: totalDuration,
        endAt: end,
        branchName,
        staffName,
        customerNote,
        pricing: {
            ...pricing,
            paymentStatus: 'unpaid',
            paymentMethod: 'cash',
        },
    });
    return { status: 'OK', message: 'Tạo lịch hẹn thành công', data: created };
};

const updateAppointment = async (id, userId, isAdmin, payload) => {
    if (!mongoose.isValidObjectId(id)) return { status: 'ERR', message: 'Appointment ID không hợp lệ' };
    const current = await Appointment.findById(id).lean();
    if (!current) return { status: 'ERR', message: 'Lịch hẹn không tồn tại' };
    if (!isAdmin && String(current.userId) !== String(userId)) return { status: 'ERR', message: 'Bạn không có quyền cập nhật lịch này' };

    const updateData = { ...payload };
    const nextPetId = updateData.petId || current.petId;
    let nextServiceIds = updateData.serviceIds || current.serviceIds;
    let totalDuration = Number(current.durationMin || 0);

    if (updateData.serviceIds) {
        if (!Array.isArray(updateData.serviceIds) || !updateData.serviceIds.length || !updateData.serviceIds.every((sid) => mongoose.isValidObjectId(sid))) {
            return { status: 'ERR', message: 'serviceIds không hợp lệ' };
        }
        const services = await Service.find({ _id: { $in: updateData.serviceIds }, isActive: true }).lean();
        if (services.length !== new Set(updateData.serviceIds.map(String)).size) return { status: 'ERR', message: 'Danh sách dịch vụ không hợp lệ' };
        totalDuration = services.reduce((sum, item) => sum + Number(item.durationMin || 0), 0);
        const pricing = computePricing(services);
        updateData.pricing = { ...current.pricing, ...pricing };
        nextServiceIds = updateData.serviceIds;
    }

    const baseSchedule = updateData.scheduleAt ? new Date(updateData.scheduleAt) : new Date(current.scheduleAt);
    if (Number.isNaN(baseSchedule.getTime())) return { status: 'ERR', message: 'scheduleAt không hợp lệ' };
    const endAt = new Date(baseSchedule.getTime() + totalDuration * 60 * 1000);
    updateData.durationMin = totalDuration;
    updateData.endAt = endAt;

    if (await checkConflict({ petId: nextPetId, scheduleAt: baseSchedule, endAt, excludedId: id })) {
        return { status: 'ERR', message: 'Thú cưng đã có lịch hẹn trùng thời gian' };
    }

    const updated = await Appointment.findByIdAndUpdate(id, updateData, { new: true });
    return { status: 'OK', message: 'Cập nhật lịch hẹn thành công', data: updated };
};

const cancelAppointment = async (id, userId, isAdmin, cancelReason = '') => {
    if (!mongoose.isValidObjectId(id)) return { status: 'ERR', message: 'Appointment ID không hợp lệ' };
    const appointment = await Appointment.findById(id);
    if (!appointment) return { status: 'ERR', message: 'Lịch hẹn không tồn tại' };
    if (!isAdmin && String(appointment.userId) !== String(userId)) return { status: 'ERR', message: 'Bạn không có quyền hủy lịch này' };
    if (['completed', 'cancelled', 'no_show'].includes(appointment.status)) return { status: 'ERR', message: 'Lịch hẹn không thể hủy' };
    appointment.status = 'cancelled';
    appointment.cancelledAt = new Date();
    appointment.cancelReason = cancelReason || 'Khách hủy lịch';
    await appointment.save();
    return { status: 'OK', message: 'Hủy lịch hẹn thành công', data: appointment };
};

const getAppointmentDetail = async (id, userId, isAdmin) => {
    if (!mongoose.isValidObjectId(id)) return { status: 'ERR', message: 'Appointment ID không hợp lệ' };
    const data = await Appointment.findById(id).populate('petId').populate('serviceIds').populate('userId', 'name email phone').lean();
    if (!data) return { status: 'ERR', message: 'Lịch hẹn không tồn tại' };
    if (!isAdmin && String(data.userId?._id || data.userId) !== String(userId)) return { status: 'ERR', message: 'Không có quyền xem lịch này' };
    return { status: 'OK', message: 'Thành công', data };
};

const getAppointments = async (userId, isAdmin, query = {}) => {
    const filter = {};
    if (!isAdmin) filter.userId = userId;
    if (query.status) filter.status = query.status;
    if (query.petId && mongoose.isValidObjectId(query.petId)) filter.petId = query.petId;
    const limit = Math.min(Math.max(parseInt(query.limit) || 50, 1), 200);
    const page = Math.max(parseInt(query.page) || 0, 0);
    const total = await Appointment.countDocuments(filter);
    const data = await Appointment.find(filter).populate('petId', 'name species breed').sort({ scheduleAt: -1 }).skip(page * limit).limit(limit).lean();
    return { status: 'OK', message: 'Thành công', data, total, pageCurrent: page + 1, totalPage: Math.ceil(total / limit) };
};

const getAvailableSlots = async (query = {}) => {
    const { date, serviceIds, stepMin = 30, openHour = 8, closeHour = 20 } = query;
    if (!date) return { status: 'ERR', message: 'date là bắt buộc (YYYY-MM-DD)' };
    const parsedServiceIds = Array.isArray(serviceIds)
        ? serviceIds
        : String(serviceIds || '')
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean);
    if (!parsedServiceIds.length || !parsedServiceIds.every((id) => mongoose.isValidObjectId(id))) {
        return { status: 'ERR', message: 'serviceIds không hợp lệ' };
    }
    const services = await Service.find({ _id: { $in: parsedServiceIds }, isActive: true }).lean();
    if (services.length !== new Set(parsedServiceIds.map(String)).size) return { status: 'ERR', message: 'Danh sách dịch vụ không hợp lệ' };
    const durationMin = services.reduce((sum, item) => sum + Number(item.durationMin || 0), 0);

    const dayStart = new Date(`${date}T00:00:00.000`);
    if (Number.isNaN(dayStart.getTime())) return { status: 'ERR', message: 'date không hợp lệ' };
    const windowStart = new Date(dayStart);
    windowStart.setHours(Number(openHour), 0, 0, 0);
    const windowEnd = new Date(dayStart);
    windowEnd.setHours(Number(closeHour), 0, 0, 0);
    if (windowEnd <= windowStart) return { status: 'ERR', message: 'Khung giờ làm việc không hợp lệ' };

    const appointments = await Appointment.find({
        status: { $in: ACTIVE_STATUSES },
        scheduleAt: { $lt: windowEnd },
        endAt: { $gt: windowStart },
    }).select('scheduleAt endAt').lean();

    const slots = [];
    const stepMs = Math.max(5, Number(stepMin)) * 60 * 1000;
    for (let start = windowStart.getTime(); start + durationMin * 60 * 1000 <= windowEnd.getTime(); start += stepMs) {
        const slotStart = new Date(start);
        const slotEnd = new Date(start + durationMin * 60 * 1000);
        const conflict = appointments.some((apt) => new Date(apt.scheduleAt) < slotEnd && new Date(apt.endAt) > slotStart);
        if (!conflict) {
            slots.push({
                startAt: slotStart.toISOString(),
                endAt: slotEnd.toISOString(),
            });
        }
    }

    return {
        status: 'OK',
        message: 'Thành công',
        data: {
            date,
            durationMin,
            slots,
        },
    };
};

module.exports = {
    createAppointment,
    updateAppointment,
    cancelAppointment,
    getAppointmentDetail,
    getAppointments,
    getAvailableSlots,
};
