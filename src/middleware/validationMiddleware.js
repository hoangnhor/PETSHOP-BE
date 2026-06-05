const { requireFields, requireParam, requireEmail } = require('../utils/requestValidation');

const sendValidationResult = (res, validation) => {
    if (!validation) return false;
    return res.status(validation.status).json(validation.body);
};

const validateBodyFields = (fields, message) => (req, res, next) => {
    const validation = requireFields(req.body, fields, message);
    if (sendValidationResult(res, validation)) return;
    return next();
};

const validateBodyEmail = (req, res, next) => {
    const validation = requireEmail(req.body?.email);
    if (sendValidationResult(res, validation)) return;
    return next();
};

const validateParam = (paramName, label) => (req, res, next) => {
    const validation = requireParam(req.params?.[paramName], label);
    if (sendValidationResult(res, validation)) return;
    return next();
};

const validateQueryParam = (queryName, label) => (req, res, next) => {
    const validation = requireParam(req.query?.[queryName], label);
    if (sendValidationResult(res, validation)) return;
    return next();
};

module.exports = {
    validateBodyFields,
    validateBodyEmail,
    validateParam,
    validateQueryParam,
};
