const InventoryLogService = require('../services/InventoryLogServices');
const { getResponseStatusCode } = require('../utils/httpStatus');
const { wrapController } = require('../utils/controllerWrapper');

const getInventoryLogs = async (req, res) => {
    const response = await InventoryLogService.getInventoryLogs(req.query);
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

module.exports = { getInventoryLogs: wrapController(getInventoryLogs) };


