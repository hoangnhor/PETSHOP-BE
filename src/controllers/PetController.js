const PetService = require('../services/PetServices');
const { getResponseStatusCode } = require('../utils/httpStatus');
const { wrapController } = require('../utils/controllerWrapper');

const createPet = async (req, res) => {
    const response = await PetService.createPet(req.userId, req.body);
    return res.status(getResponseStatusCode(response, 201)).json(response);
};

const updatePet = async (req, res) => {
    const response = await PetService.updatePet(req.params.id, req.userId, req.isAdmin, req.body);
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

const deletePet = async (req, res) => {
    const response = await PetService.deletePet(req.params.id, req.userId, req.isAdmin);
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

const getPetDetail = async (req, res) => {
    const response = await PetService.getPetDetail(req.params.id, req.userId, req.isAdmin);
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

const getMyPets = async (req, res) => {
    const response = await PetService.getMyPets(req.userId, req.query);
    return res.status(getResponseStatusCode(response, 200)).json(response);
};

module.exports = {
    createPet: wrapController(createPet),
    updatePet: wrapController(updatePet),
    deletePet: wrapController(deletePet),
    getPetDetail: wrapController(getPetDetail),
    getMyPets: wrapController(getMyPets),
};



