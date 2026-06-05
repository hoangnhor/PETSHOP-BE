const mongoose = require('mongoose');
const InventoryLog = require('../models/InventoryLogModel');

const parseQueryDate = (value) => {
    if (value === undefined || value === null || String(value).trim() === '') return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getInventoryLogs = async (query = {}) => {
    const filter = {};
    if (query.productId) {
        if (!mongoose.isValidObjectId(query.productId)) return { status: 'ERR', message: 'productId không hợp lệ' };
        filter.productId = query.productId;
    }
    if (query.type) filter.type = query.type;
    if (query.billId && mongoose.isValidObjectId(query.billId)) filter.billId = query.billId;
    if (query.from || query.to) {
        const fromDate = parseQueryDate(query.from);
        const toDate = parseQueryDate(query.to);
        if ((query.from && !fromDate) || (query.to && !toDate)) {
            return { status: 'ERR', message: 'from hoặc to không hợp lệ' };
        }
        filter.createdAt = {};
        if (fromDate) filter.createdAt.$gte = fromDate;
        if (toDate) filter.createdAt.$lte = toDate;
    }
    const limit = Math.min(Math.max(parseInt(query.limit) || 50, 1), 500);
    const page = Math.max(parseInt(query.page) || 0, 0);
    const total = await InventoryLog.countDocuments(filter);
    const data = await InventoryLog.find(filter)
        .populate('productId', 'name sku')
        .populate('billId', 'orderCode orderStatus')
        .sort({ createdAt: -1 })
        .skip(page * limit)
        .limit(limit)
        .lean();
    return { status: 'OK', message: 'Thành công', data, total, pageCurrent: page + 1, totalPage: Math.ceil(total / limit) };
};

module.exports = { getInventoryLogs };
