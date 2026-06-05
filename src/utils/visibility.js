const buildActiveOnlyFilter = (extraFilter = {}) => ({
    ...extraFilter,
    isActive: true,
});

const isActiveRecord = (doc) => Boolean(doc && doc.isActive);

module.exports = {
    buildActiveOnlyFilter,
    isActiveRecord,
};
