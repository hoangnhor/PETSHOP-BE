const express = require('express');
const router = express.Router();
const PetController = require('../controllers/PetController');
const { verifyToken } = require('../middleware/authMiddleware');
const { validateBodyFields, validateParam } = require('../middleware/validationMiddleware');

router.post('/create', verifyToken, validateBodyFields(['name', 'species'], 'name và species là bắt buộc'), PetController.createPet);
router.put('/update/:id', verifyToken, validateParam('id', 'Pet ID'), PetController.updatePet);
router.delete('/delete/:id', verifyToken, validateParam('id', 'Pet ID'), PetController.deletePet);
router.get('/get-details/:id', verifyToken, validateParam('id', 'Pet ID'), PetController.getPetDetail);
router.get('/my', verifyToken, PetController.getMyPets);

module.exports = router;
