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

const restoreStockItems = async (items, session = null) => {
    for (const item of items) {
        await Product.updateOne(
            { _id: item.idsp },
            {
                $inc: {
                    countInStock: item.quantity,
                    selled: -item.quantity,
                },
            }
            ,
            session ? { session } : {}
        );
        await Product.updateOne(
            { _id: item.idsp, selled: { $lt: 0 } },
            { $set: { selled: 0 } },
            session ? { session } : {}
        );
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

    const session = await mongoose.startSession();
    try {
        let createdBill;
        await session.withTransaction(async () => {
            for (const item of orderItems) {
                const updateResult = await Product.updateOne(
                    { _id: item.idsp, countInStock: { $gte: item.quantity } },
                    {
                        $inc: {
                            countInStock: -item.quantity,
                            selled: item.quantity,
                        },
                    },
                    { session }
                );

                if (updateResult.modifiedCount !== 1) {
                    throw new Error(`Sản phẩm ${item.name} không đủ hàng`);
                }
            }

            const createdBills = await Bill.create(
                [{
                    iduser: userId,
                    items: orderItems,
                    shippingAddress: normalizedShippingAddress,
                    paymentMethod,
                    paymentStatus: paymentMethod === 'COD' ? 'unpaid' : 'paid',
                    orderStatus: 'pending',
                    tongtien,
                    note,
                    paidAt: paymentMethod === 'COD' ? null : new Date(),
                }],
                { session }
            );
            createdBill = createdBills[0];
        });

        return {
            status: 'OK',
            message: 'Tạo đơn hàng thành công',
            data: createdBill,
        };
    } catch (error) {
        return {
            status: 'ERR',
            message: error.message || 'Tạo đơn hàng thất bại',
        };
    } finally {
        await session.endSession();
    }
};

const getAllBill = async (userId, isAdmin, query = {}) => {
    const filter = {};
    if (!isAdmin) filter.iduser = userId;
    if (query.orderStatus) filter.orderStatus = query.orderStatus;
    if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;

    const limit = Math.min(Math.max(parseInt(query.limit) || 50, 1), 200);
    const page = Math.max(parseInt(query.page) || 0, 0);

    const total = await Bill.countDocuments(filter);
    const allBills = await Bill.find(filter)
        .populate('iduser', 'name email phone address')
        .populate('items.idsp')
        .sort({ createdAt: -1 })
        .skip(page * limit)
        .limit(limit)
        .lean();

    return {
        status: 'OK',
        message: 'Thành công',
        data: allBills,
        total,
        pageCurrent: page + 1,
        totalPage: Math.ceil(total / limit),
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

    const session = await mongoose.startSession();
    try {
        let cancelledBill;
        await session.withTransaction(async () => {
            const updatePayload = {
                orderStatus: 'cancelled',
                cancelledAt: new Date(),
                cancelReason: cancelReason || 'Khách hàng hủy đơn',
            };

            if (bill.paymentStatus === 'paid') {
                updatePayload.paymentStatus = 'refunded';
            }

            cancelledBill = await Bill.findOneAndUpdate(
                { _id: billId, orderStatus: { $nin: ['delivered', 'cancelled'] } },
                { $set: updatePayload },
                { new: true, session }
            );

            if (!cancelledBill) {
                throw new Error('Không thể hủy đơn hàng đã giao hoặc đã hủy');
            }

            await restoreStockItems(cancelledBill.items, session);
        });

        return {
            status: 'OK',
            message: 'Hủy đơn hàng thành công',
            data: cancelledBill,
        };
    } catch (error) {
        return {
            status: 'ERR',
            message: error.message || 'Hủy đơn hàng thất bại',
        };
    } finally {
        await session.endSession();
    }
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

    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            const currentBill = await Bill.findById(billId).session(session);
            if (!currentBill) {
                throw new Error('Hóa đơn không tồn tại');
            }

            const shouldRestore = !['cancelled', 'delivered'].includes(currentBill.orderStatus);
            if (shouldRestore) {
                const claimedBill = await Bill.findOneAndUpdate(
                    { _id: billId, orderStatus: { $nin: ['cancelled', 'delivered'] } },
                    { $set: { orderStatus: 'cancelled' } },
                    { new: true, session }
                );

                if (claimedBill) {
                    await restoreStockItems(claimedBill.items, session);
                }
            }

            await Bill.deleteOne({ _id: billId }, { session });
        });
    } catch (error) {
        if (error.message === 'Hóa đơn không tồn tại') {
            return {
                status: 'ERR',
                message: error.message,
            };
        }
        return {
            status: 'ERR',
            message: 'Xóa thất bại',
        };
    } finally {
        await session.endSession();
    }

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

