const express = require('express');
const router = express.Router();
const PetController = require('../controllers/PetController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/create', verifyToken, PetController.createPet);
router.put('/update/:id', verifyToken, PetController.updatePet);
router.delete('/delete/:id', verifyToken, PetController.deletePet);
router.get('/get-details/:id', verifyToken, PetController.getPetDetail);
router.get('/my', verifyToken, PetController.getMyPets);

module.exports = router;
