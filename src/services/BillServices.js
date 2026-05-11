const Bill = require('../models/BillModel');
const User = require('../models/UserModel');
const Product = require('../models/ProductModel');
const mongoose = require('mongoose');

const ORDER_STATUSES = ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'];
const PAYMENT_STATUSES = ['unpaid', 'paid', 'refunded'];
const PAYMENT_METHODS = ['COD', 'BANKING', 'MOMO', 'VNPAY'];

const getShippingAddress = (shippingAddress, user) => {
    return {
        fullName: shippingAddress?.fullName || user.name || '',
        phone: shippingAddress?.phone || user.phone || '',
        address: shippingAddress?.address || user.address || '',
        city: shippingAddress?.city || '',
    };
};

const restoreStock = async (bill) => {
    for (const item of bill.items) {
        const product = await Product.findById(item.idsp);
        if (product) {
            product.countInStock += item.quantity;
            product.selled = Math.max((product.selled || 0) - item.quantity, 0);
            await product.save();
        }
    }
};

const restoreStockItems = async (items) => {
    for (const item of items) {
        await Product.updateOne(
            { _id: item.idsp },
            {
                $inc: {
                    countInStock: item.quantity,
                    selled: -item.quantity,
                },
            }
        );
        const product = await Product.findById(item.idsp);
        if (product && product.selled < 0) {
            product.selled = 0;
            await product.save();
        }
    }
};

const createBill = async (newBill, userId) => {
    const { items, shippingAddress, paymentMethod = 'COD', note = '' } = newBill;

    if (!userId) {
        return {
            status: 'ERR',
            message: 'Người dùng chưa đăng nhập',
        };
    }

    if (!Array.isArray(items) || items.length === 0) {
        return {
            status: 'ERR',
            message: 'Đơn hàng phải có ít nhất một sản phẩm',
        };
    }

    if (!PAYMENT_METHODS.includes(paymentMethod)) {
        return {
            status: 'ERR',
            message: 'Phương thức thanh toán không hợp lệ',
        };
    }

    const user = await User.findById(userId);
    if (!user) {
        return {
            status: 'ERR',
            message: 'Người dùng không tồn tại',
        };
    }

    const normalizedShippingAddress = getShippingAddress(shippingAddress, user);
    if (
        !normalizedShippingAddress.fullName ||
        !normalizedShippingAddress.phone ||
        !normalizedShippingAddress.address
    ) {
        return {
            status: 'ERR',
            message: 'Vui lòng cung cấp đầy đủ tên, số điện thoại và địa chỉ nhận hàng',
        };
    }

    let tongtien = 0;
    const orderItems = [];
    const requestedItems = new Map();

    for (const item of items) {
        const quantity = Number(item.quantity);
        if (!item.idsp || !mongoose.isValidObjectId(item.idsp) || !Number.isInteger(quantity) || quantity < 1) {
            return {
                status: 'ERR',
                message: 'Thông tin sản phẩm trong đơn hàng không hợp lệ',
            };
        }
        const productId = item.idsp.toString();
        requestedItems.set(productId, (requestedItems.get(productId) || 0) + quantity);
    }

    for (const [productId, quantity] of requestedItems.entries()) {
        const product = await Product.findById(productId);
        if (!product) {
            return {
                status: 'ERR',
                message: `Sản phẩm ${productId} không tồn tại`,
            };
        }

        if (product.countInStock < quantity) {
            return {
                status: 'ERR',
                message: `Sản phẩm ${product.name} không đủ hàng (còn: ${product.countInStock})`,
            };
        }

        const priceAfterDiscount = product.price * (1 - (product.discount || 0) / 100);
        const subtotal = Math.round(priceAfterDiscount * quantity);
        tongtien += subtotal;

        orderItems.push({
            idsp: product._id,
            name: product.name,
            image: product.image || '',
            price: product.price,
            discount: product.discount || 0,
            quantity,
            subtotal,
        });
    }

    const updatedItems = [];
    try {
        for (const item of orderItems) {
            const updateResult = await Product.updateOne(
                { _id: item.idsp, countInStock: { $gte: item.quantity } },
                {
                    $inc: {
                        countInStock: -item.quantity,
                        selled: item.quantity,
                    },
                }
            );

            if (updateResult.modifiedCount !== 1) {
                throw new Error(`Sản phẩm ${item.name} không đủ hàng`);
            }

            updatedItems.push(item);
        }

        const createdBill = await Bill.create({
            iduser: userId,
            items: orderItems,
            shippingAddress: normalizedShippingAddress,
            paymentMethod,
            paymentStatus: paymentMethod === 'COD' ? 'unpaid' : 'paid',
            orderStatus: 'pending',
            tongtien,
            note,
            paidAt: paymentMethod === 'COD' ? null : new Date(),
        });

        return {
            status: 'OK',
            message: 'Tạo đơn hàng thành công',
            data: createdBill,
        };
    } catch (error) {
        await restoreStockItems(updatedItems);
        return {
            status: 'ERR',
            message: error.message || 'Tạo đơn hàng thất bại',
        };
    }
};

const getAllBill = async (userId, isAdmin, query = {}) => {
    const filter = {};
    if (!isAdmin) filter.iduser = userId;
    if (query.orderStatus) filter.orderStatus = query.orderStatus;
    if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;

    const allBills = await Bill.find(filter)
        .populate('iduser', 'name email phone address')
        .populate('items.idsp')
        .sort({ createdAt: -1 });

    return {
        status: 'OK',
        message: 'Thành công',
        data: allBills,
    };
};

const getDetailsBill = async (billId, userId, isAdmin) => {
    if (!mongoose.isValidObjectId(billId)) {
        return {
            status: 'ERR',
            message: 'Bill ID không hợp lệ',
        };
    }

    const bill = await Bill.findById(billId)
        .populate('iduser', 'name email phone address')
        .populate('items.idsp');

    if (!bill) {
        return {
            status: 'ERR',
            message: 'Hóa đơn không tồn tại',
        };
    }

    if (!isAdmin && bill.iduser._id.toString() !== userId) {
        return {
            status: 'ERR',
            message: 'Bạn không có quyền xem hóa đơn này',
        };
    }

    return {
        status: 'OK',
        message: 'Thành công',
        data: bill,
    };
};

const updateBillStatus = async (billId, payload) => {
    const { orderStatus, paymentStatus, cancelReason = '' } = payload;
    if (!mongoose.isValidObjectId(billId)) {
        return {
            status: 'ERR',
            message: 'Bill ID không hợp lệ',
        };
    }

    const bill = await Bill.findById(billId);

    if (!bill) {
        return {
            status: 'ERR',
            message: 'Hóa đơn không tồn tại',
        };
    }

    if (orderStatus && !ORDER_STATUSES.includes(orderStatus)) {
        return {
            status: 'ERR',
            message: 'Trạng thái đơn hàng không hợp lệ',
        };
    }

    if (paymentStatus && !PAYMENT_STATUSES.includes(paymentStatus)) {
        return {
            status: 'ERR',
            message: 'Trạng thái thanh toán không hợp lệ',
        };
    }

    if (bill.orderStatus === 'cancelled') {
        return {
            status: 'ERR',
            message: 'Không thể cập nhật đơn hàng đã hủy',
        };
    }

    if (orderStatus === 'cancelled') {
        return cancelBill(billId, null, true, cancelReason);
    }

    if (orderStatus) {
        bill.orderStatus = orderStatus;
        if (orderStatus === 'delivered') {
            bill.deliveredAt = new Date();
            if (bill.paymentMethod === 'COD' && bill.paymentStatus === 'unpaid') {
                bill.paymentStatus = 'paid';
                bill.paidAt = new Date();
            }
        }
    }

    if (paymentStatus) {
        bill.paymentStatus = paymentStatus;
        if (paymentStatus === 'paid' && !bill.paidAt) {
            bill.paidAt = new Date();
        }
    }

    await bill.save();

    return {
        status: 'OK',
        message: 'Cập nhật đơn hàng thành công',
        data: bill,
    };
};

const cancelBill = async (billId, userId, isAdmin = false, cancelReason = '') => {
    if (!mongoose.isValidObjectId(billId)) {
        return {
            status: 'ERR',
            message: 'Bill ID không hợp lệ',
        };
    }

    const bill = await Bill.findById(billId);

    if (!bill) {
        return {
            status: 'ERR',
            message: 'Hóa đơn không tồn tại',
        };
    }

    if (!isAdmin && bill.iduser.toString() !== userId) {
        return {
            status: 'ERR',
            message: 'Bạn không có quyền hủy đơn hàng này',
        };
    }

    if (['delivered', 'cancelled'].includes(bill.orderStatus)) {
        return {
            status: 'ERR',
            message: 'Không thể hủy đơn hàng đã giao hoặc đã hủy',
        };
    }

    await restoreStock(bill);
    bill.orderStatus = 'cancelled';
    bill.cancelledAt = new Date();
    bill.cancelReason = cancelReason || 'Khách hàng hủy đơn';
    if (bill.paymentStatus === 'paid') {
        bill.paymentStatus = 'refunded';
    }

    await bill.save();

    return {
        status: 'OK',
        message: 'Hủy đơn hàng thành công',
        data: bill,
    };
};

const deleteBill = async (billId) => {
    if (!mongoose.isValidObjectId(billId)) {
        return {
            status: 'ERR',
            message: 'Bill ID không hợp lệ',
        };
    }

    const bill = await Bill.findById(billId);

    if (!bill) {
        return {
            status: 'ERR',
            message: 'Hóa đơn không tồn tại',
        };
    }

    if (!['cancelled', 'delivered'].includes(bill.orderStatus)) {
        await restoreStock(bill);
    }

    await Bill.findByIdAndDelete(billId);

    return {
        status: 'OK',
        message: 'Xóa thành công',
    };
};

module.exports = {
    createBill,
    getAllBill,
    getDetailsBill,
    updateBillStatus,
    cancelBill,
    deleteBill,
};
