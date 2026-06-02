const BillService = require('../services/BillServices');
const { getResponseStatusCode } = require('../utils/httpStatus');

const createBill = async (req, res) => {
    try {
        const response = await BillService.createBill(req.body, req.userId);
        return res.status(getResponseStatusCode(response, 201)).json(response);
    } catch (error) {
        return res.status(500).json({
            status: 'ERR',
            code: 'INTERNAL_ERROR',
            message: 'Lỗi hệ thống',
        });
    }
};

const getAllBill = async (req, res) => {
    try {
        const response = await BillService.getAllBill(req.userId, req.isAdmin, req.query);
        return res.status(getResponseStatusCode(response, 200)).json(response);
    } catch (error) {
        return res.status(500).json({
            status: 'ERR',
            code: 'INTERNAL_ERROR',
            message: 'Lỗi hệ thống',
        });
    }
};

const getDetailsBill = async (req, res) => {
    try {
        const billId = req.params.id;
        if (!billId) {
            return res.status(400).json({
                status: 'ERR',
                message: 'Bill ID bắt buộc',
            });
        }
        const response = await BillService.getDetailsBill(billId, req.userId, req.isAdmin);
        return res.status(getResponseStatusCode(response, 200)).json(response);
    } catch (error) {
        return res.status(500).json({
            status: 'ERR',
            code: 'INTERNAL_ERROR',
            message: 'Lỗi hệ thống',
        });
    }
};

const updateBillStatus = async (req, res) => {
    try {
        const billId = req.params.id;
        if (!billId) {
            return res.status(400).json({
                status: 'ERR',
                message: 'Bill ID bắt buộc',
            });
        }
        const response = await BillService.updateBillStatus(billId, req.body);
        return res.status(getResponseStatusCode(response, 200)).json(response);
    } catch (error) {
        return res.status(500).json({
            status: 'ERR',
            code: 'INTERNAL_ERROR',
            message: 'Lỗi hệ thống',
        });
    }
};

const cancelBill = async (req, res) => {
    try {
        const billId = req.params.id;
        if (!billId) {
            return res.status(400).json({
                status: 'ERR',
                message: 'Bill ID bắt buộc',
            });
        }
        const response = await BillService.cancelBill(
            billId,
            req.userId,
            req.isAdmin,
            req.body?.cancelReason
        );
        return res.status(getResponseStatusCode(response, 200)).json(response);
    } catch (error) {
        return res.status(500).json({
            status: 'ERR',
            code: 'INTERNAL_ERROR',
            message: 'Lỗi hệ thống',
        });
    }
};

const deleteBill = async (req, res) => {
    try {
        const billId = req.params.id;
        if (!billId) {
            return res.status(400).json({
                status: 'ERR',
                message: 'Bill ID bắt buộc',
            });
        }
        const response = await BillService.deleteBill(billId, req.userId);
        return res.status(getResponseStatusCode(response, 200)).json(response);
    } catch (error) {
        return res.status(500).json({
            status: 'ERR',
            code: 'INTERNAL_ERROR',
            message: 'Lỗi hệ thống',
        });
    }
};

const confirmPaymentWebhook = async (req, res) => {
    try {
        const signature = req.headers['x-payment-signature'] || req.headers['x-webhook-signature'] || '';
        const response = await BillService.confirmPaymentFromWebhook(req.body, signature, req.rawBody);
        return res.status(getResponseStatusCode(response, 200)).json(response);
    } catch (error) {
        return res.status(500).json({
            status: 'ERR',
            code: 'INTERNAL_ERROR',
            message: 'Lỗi hệ thống',
        });
    }
};

module.exports = {
    createBill,
    getAllBill,
    getDetailsBill,
    updateBillStatus,
    cancelBill,
    deleteBill,
    confirmPaymentWebhook,
};




