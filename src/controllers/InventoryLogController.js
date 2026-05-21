const InventoryLogService = require('../services/InventoryLogServices');

const getInventoryLogs = async (req, res) => {
    try {
        const response = await InventoryLogService.getInventoryLogs(req.query);
        return res.status(response.status === 'OK' ? 200 : 400).json(response);
    } catch (error) {
        return res.status(500).json({ status: 'ERR', code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' });
    }
};

module.exports = { getInventoryLogs };
