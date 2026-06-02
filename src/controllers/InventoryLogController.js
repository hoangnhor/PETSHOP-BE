const InventoryLogService = require('../services/InventoryLogServices');
const { getResponseStatusCode } = require('../utils/httpStatus');

const getInventoryLogs = async (req, res) => {
    try {
        const response = await InventoryLogService.getInventoryLogs(req.query);
        return res.status(getResponseStatusCode(response, 200)).json(response);
    } catch (error) {
        return res.status(500).json({ status: 'ERR', code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' });
    }
};

module.exports = { getInventoryLogs };


