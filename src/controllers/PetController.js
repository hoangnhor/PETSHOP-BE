const PetService = require('../services/PetServices');

const createPet = async (req, res) => {
    try {
        const response = await PetService.createPet(req.userId, req.body);
        return res.status(response.status === 'OK' ? 201 : 400).json(response);
    } catch (error) {
        return res.status(500).json({ status: 'ERR', code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' });
    }
};

const updatePet = async (req, res) => {
    try {
        const response = await PetService.updatePet(req.params.id, req.userId, req.isAdmin, req.body);
        return res.status(response.status === 'OK' ? 200 : 400).json(response);
    } catch (error) {
        return res.status(500).json({ status: 'ERR', code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' });
    }
};

const deletePet = async (req, res) => {
    try {
        const response = await PetService.deletePet(req.params.id, req.userId, req.isAdmin);
        return res.status(response.status === 'OK' ? 200 : 400).json(response);
    } catch (error) {
        return res.status(500).json({ status: 'ERR', code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' });
    }
};

const getPetDetail = async (req, res) => {
    try {
        const response = await PetService.getPetDetail(req.params.id, req.userId, req.isAdmin);
        return res.status(response.status === 'OK' ? 200 : 400).json(response);
    } catch (error) {
        return res.status(500).json({ status: 'ERR', code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' });
    }
};

const getMyPets = async (req, res) => {
    try {
        const response = await PetService.getMyPets(req.userId, req.query);
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({ status: 'ERR', code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' });
    }
};

module.exports = {
    createPet,
    updatePet,
    deletePet,
    getPetDetail,
    getMyPets,
};
