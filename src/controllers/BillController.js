const BillService = require('../services/BillServices');
const { getResponseStatusCode } = require('../utils/httpStatus');
const { wrapController } = require('../utils/controllerWrapper');

const createBill = async (req, res) => {
    const response = await BillService.createBill(req.body, req.userId);
    return res.status(getResponseStatusCode(response, 201)).json(response);
};

const getAllBill = async (req, res) => {
    const response = await BillService.getAllBill(req.userId, req.isAdmin, req.query);
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

const getDetailsBill = async (req, res) => {
    const response = await BillService.getDetailsBill(req.params.id, req.userId, req.isAdmin);
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

const updateBillStatus = async (req, res) => {
    const response = await BillService.updateBillStatus(req.params.id, req.body);
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

const cancelBill = async (req, res) => {
    const response = await BillService.cancelBill(
        req.params.id,
        req.userId,
        req.isAdmin,
        req.body?.cancelReason
    );
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

const deleteBill = async (req, res) => {
    const response = await BillService.deleteBill(req.params.id, req.userId);
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

const confirmPaymentWebhook = async (req, res) => {
    const signature = req.headers['x-payment-signature'] || req.headers['x-webhook-signature'] || '';
    const response = await BillService.confirmPaymentFromWebhook(req.body, signature, req.rawBody);
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

module.exports = {
    createBill: wrapController(createBill),
    getAllBill: wrapController(getAllBill),
    getDetailsBill: wrapController(getDetailsBill),
    updateBillStatus: wrapController(updateBillStatus),
    cancelBill: wrapController(cancelBill),
    deleteBill: wrapController(deleteBill),
    confirmPaymentWebhook: wrapController(confirmPaymentWebhook),
};




