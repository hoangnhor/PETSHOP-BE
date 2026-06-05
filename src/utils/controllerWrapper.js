const sendDefaultControllerError = (res, error) =>
    res.status(Number(error?.statusCode) || 500).json({
        status: 'ERR',
        code: error?.code || 'INTERNAL_ERROR',
        message: Number(error?.statusCode) >= 500 ? 'Lỗi hệ thống' : (error?.message || 'Lỗi hệ thống'),
    });

const wrapController = (handler, { onError } = {}) => async (req, res, next) => {
    try {
        return await handler(req, res, next);
    } catch (error) {
        if (typeof onError === 'function') {
            const handled = await onError(error, req, res, next);
            if (handled !== undefined) return handled;
        }
        return sendDefaultControllerError(res, error);
    }
};

module.exports = {
    wrapController,
};
