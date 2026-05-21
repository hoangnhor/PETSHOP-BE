const mongoose = require('mongoose');
const InventoryLog = require('../models/InventoryLogModel');

const getInventoryLogs = async (query = {}) => {
    const filter = {};
    if (query.productId) {
        if (!mongoose.isValidObjectId(query.productId)) return { status: 'ERR', message: 'productId không hợp lệ' };
        filter.productId = query.productId;
    }
    if (query.type) filter.type = query.type;
    if (query.billId && mongoose.isValidObjectId(query.billId)) filter.billId = query.billId;
    if (query.from || query.to) {
        filter.createdAt = {};
        if (query.from) filter.createdAt.$gte = new Date(query.from);
        if (query.to) filter.createdAt.$lte = new Date(query.to);
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
