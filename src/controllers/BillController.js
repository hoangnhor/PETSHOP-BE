const BillService = require('../services/BillServices');

const createBill = async (req, res) => {
    try {
        const response = await BillService.createBill(req.body, req.userId);
        return res.status(response.status === 'OK' ? 201 : 400).json(response);
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
        return res.status(response.status === 'OK' ? 200 : 400).json(response);
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
        return res.status(response.status === 'OK' ? 200 : 400).json(response);
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
        return res.status(response.status === 'OK' ? 200 : 400).json(response);
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
        return res.status(response.status === 'OK' ? 200 : 400).json(response);
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
        const response = await BillService.deleteBill(billId);
        return res.status(response.status === 'OK' ? 200 : 400).json(response);
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
};


