const mongoose = require('mongoose');
const crypto = require('crypto');
const Appointment = require('../models/AppointmentModel');
const Pet = require('../models/PetModel');
const Service = require('../models/ServiceModel');

const ACTIVE_STATUSES = ['pending', 'confirmed', 'checked_in', 'in_service'];
const APPOINTMENT_STATUSES = ['pending', 'confirmed', 'checked_in', 'in_service', 'completed', 'cancelled', 'no_show'];
const VIETNAM_UTC_OFFSET_MINUTES = 7 * 60;
const APPOINTMENT_STATUS_TRANSITIONS = {
    pending: ['confirmed', 'cancelled', 'no_show'],
    confirmed: ['checked_in', 'cancelled', 'no_show'],
    checked_in: ['in_service', 'cancelled', 'no_show'],
    in_service: ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
    no_show: [],
};

const USER_MUTABLE_FIELDS = new Set([
    'serviceIds',
    'scheduleAt',
    'branchName',
    'customerNote',
]);

const ADMIN_MUTABLE_FIELDS = new Set([
    ...USER_MUTABLE_FIELDS,
    'petId',
    'staffName',
    'internalNote',
    'status',
    'bookingChannel',
    'cancelReason',
]);

const pickAppointmentUpdateFields = (payload = {}, isAdmin = false) => {
    const allowed = isAdmin ? ADMIN_MUTABLE_FIELDS : USER_MUTABLE_FIELDS;
    return Object.entries(payload).reduce((acc, [key, value]) => {
        if (allowed.has(key)) acc[key] = value;
        return acc;
    }, {});
};

const generateAppointmentCode = () =>
    `APT${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

const canTransitionAppointmentStatus = (currentStatus, nextStatus) => {
    if (!nextStatus || currentStatus === nextStatus) return true;
    const allowed = APPOINTMENT_STATUS_TRANSITIONS[currentStatus] || [];
    return allowed.includes(nextStatus);
};

const createAppointmentWithUniqueCode = async (baseData) => {
    let lastError;
    for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
            return await Appointment.create({
                ...baseData,
                appointmentCode: generateAppointmentCode(),
            });
        } catch (error) {
            if (error?.code !== 11000) throw error;
            lastError = error;
        }
    }
    throw lastError || new Error('Không thể tạo mã lịch hẹn duy nhất');
};

const parseDateOnly = (value) => {
    const matched = String(value || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!matched) return null;
    const year = Number(matched[1]);
    const month = Number(matched[2]);
    const day = Number(matched[3]);
    const check = new Date(Date.UTC(year, month - 1, day));
    if (
        check.getUTCFullYear() !== year ||
        check.getUTCMonth() + 1 !== month ||
        check.getUTCDate() !== day
    ) {
        return null;
    }
    return { year, month, day };
};

const buildVietnamDate = ({ year, month, day }, hour = 0, minute = 0) =>
    new Date(Date.UTC(year, month - 1, day, Number(hour), Number(minute), 0, 0) - VIETNAM_UTC_OFFSET_MINUTES * 60 * 1000);

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

    const uniqueServiceIds = [...new Set(serviceIds.map(String))];
    const services = await Service.find({ _id: { $in: uniqueServiceIds }, isActive: true }).lean();
    if (services.length !== uniqueServiceIds.length) return { status: 'ERR', message: 'Danh sách dịch vụ không hợp lệ' };

    const totalDuration = services.reduce((sum, service) => sum + Number(service.durationMin || 0), 0);
    const start = new Date(scheduleAt);
    if (Number.isNaN(start.getTime())) return { status: 'ERR', message: 'scheduleAt không hợp lệ' };
    if (start.getTime() <= Date.now()) return { status: 'ERR', message: 'Lịch hẹn phải ở thời điểm tương lai' };
    const end = new Date(start.getTime() + totalDuration * 60 * 1000);
    if (await checkConflict({ petId, scheduleAt: start, endAt: end })) return { status: 'ERR', message: 'Thú cưng đã có lịch hẹn trùng thời gian' };

    const pricing = computePricing(services);
    const created = await createAppointmentWithUniqueCode({
        userId: pet.userId,
        petId,
        serviceIds: uniqueServiceIds,
        bookingChannel: isAdmin ? 'admin' : 'web',
        scheduleAt: start,
        durationMin: totalDuration,
        endAt: end,
        branchName,
        staffName: isAdmin ? staffName : '',
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

    const updateData = pickAppointmentUpdateFields(payload, isAdmin);
    if (!Object.keys(updateData).length) {
        return { status: 'ERR', message: 'Không có dữ liệu hợp lệ để cập nhật' };
    }

    if (updateData.status && !APPOINTMENT_STATUSES.includes(updateData.status)) {
        return { status: 'ERR', message: 'status không hợp lệ' };
    }
    if (updateData.status && !canTransitionAppointmentStatus(current.status, updateData.status)) {
        return { status: 'ERR', message: `Không thể chuyển lịch từ ${current.status} sang ${updateData.status}` };
    }

    if (updateData.petId) {
        if (!mongoose.isValidObjectId(updateData.petId)) {
            return { status: 'ERR', message: 'petId không hợp lệ' };
        }
        const nextPet = await Pet.findById(updateData.petId).lean();
        if (!nextPet) return { status: 'ERR', message: 'Thú cưng không tồn tại' };
        if (!isAdmin && String(nextPet.userId) !== String(userId)) {
            return { status: 'ERR', message: 'Bạn không có quyền chọn thú cưng này' };
        }
        updateData.userId = nextPet.userId;
    }

    const nextPetId = updateData.petId || current.petId;
    let totalDuration = Number(current.durationMin || 0);

    if (updateData.serviceIds) {
        if (!Array.isArray(updateData.serviceIds) || !updateData.serviceIds.length || !updateData.serviceIds.every((sid) => mongoose.isValidObjectId(sid))) {
            return { status: 'ERR', message: 'serviceIds không hợp lệ' };
        }
        const uniqueServiceIds = [...new Set(updateData.serviceIds.map(String))];
        const services = await Service.find({ _id: { $in: uniqueServiceIds }, isActive: true }).lean();
        if (services.length !== uniqueServiceIds.length) return { status: 'ERR', message: 'Danh sách dịch vụ không hợp lệ' };
        totalDuration = services.reduce((sum, item) => sum + Number(item.durationMin || 0), 0);
        const pricing = computePricing(services);
        updateData.pricing = { ...current.pricing, ...pricing };
        updateData.serviceIds = uniqueServiceIds;
    }

    if (updateData.status === 'cancelled') {
        updateData.cancelledAt = new Date();
        updateData.cancelReason = String(updateData.cancelReason || '').trim() || 'Lịch hẹn đã bị hủy';
    }

    if (updateData.status === 'completed') {
        updateData.completedAt = new Date();
    }

    const baseSchedule = updateData.scheduleAt ? new Date(updateData.scheduleAt) : new Date(current.scheduleAt);
    if (Number.isNaN(baseSchedule.getTime())) return { status: 'ERR', message: 'scheduleAt không hợp lệ' };
    if (updateData.scheduleAt && baseSchedule.getTime() <= Date.now()) {
        return { status: 'ERR', message: 'Lịch hẹn phải ở thời điểm tương lai' };
    }
    const endAt = new Date(baseSchedule.getTime() + totalDuration * 60 * 1000);
    updateData.durationMin = totalDuration;
    updateData.endAt = endAt;

    if (await checkConflict({ petId: nextPetId, scheduleAt: baseSchedule, endAt, excludedId: id })) {
        return { status: 'ERR', message: 'Thú cưng đã có lịch hẹn trùng thời gian' };
    }

    const updated = await Appointment.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
    });
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
    const parsedStepMin = Number.parseInt(stepMin, 10);
    const parsedOpenHour = Number.parseInt(openHour, 10);
    const parsedCloseHour = Number.parseInt(closeHour, 10);
    if (!Number.isInteger(parsedStepMin) || parsedStepMin < 5 || parsedStepMin > 240) {
        return { status: 'ERR', message: 'stepMin phải nằm trong khoảng 5-240 phút' };
    }
    if (!Number.isInteger(parsedOpenHour) || parsedOpenHour < 0 || parsedOpenHour > 23) {
        return { status: 'ERR', message: 'openHour phải là số nguyên trong khoảng 0-23' };
    }
    if (!Number.isInteger(parsedCloseHour) || parsedCloseHour < 1 || parsedCloseHour > 24) {
        return { status: 'ERR', message: 'closeHour phải là số nguyên trong khoảng 1-24' };
    }
    if (parsedCloseHour <= parsedOpenHour) {
        return { status: 'ERR', message: 'closeHour phải lớn hơn openHour' };
    }
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

    const parsedDate = parseDateOnly(date);
    if (!parsedDate) return { status: 'ERR', message: 'date không hợp lệ (YYYY-MM-DD)' };
    const windowStart = buildVietnamDate(parsedDate, parsedOpenHour, 0);
    const windowEnd = buildVietnamDate(parsedDate, parsedCloseHour, 0);
    if (windowEnd <= windowStart) return { status: 'ERR', message: 'Khung giờ làm việc không hợp lệ' };

    const appointments = await Appointment.find({
        status: { $in: ACTIVE_STATUSES },
        scheduleAt: { $lt: windowEnd },
        endAt: { $gt: windowStart },
    }).select('scheduleAt endAt').lean();

    const slots = [];
    const stepMs = parsedStepMin * 60 * 1000;
    for (let start = windowStart.getTime(); start + durationMin * 60 * 1000 <= windowEnd.getTime(); start += stepMs) {
        const slotStart = new Date(start);
        const slotEnd = new Date(start + durationMin * 60 * 1000);
        const conflict = appointments.some((apt) => new Date(apt.scheduleAt) < slotEnd && new Date(apt.endAt) > slotStart);
        if (!conflict) {
            slots.push({
                startAt: slotStart.toISOString(),
                endAt: slotEnd.toISOString(),
                timezone: 'Asia/Ho_Chi_Minh',
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
