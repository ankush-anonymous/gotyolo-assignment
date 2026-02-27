const express = require('express');
const tripController = require('../controllers/tripController');

const router = express.Router();

router.get('/', tripController.getAll);
router.get('/published', tripController.getPublished);
router.get('/:id', tripController.getById);
router.post('/', tripController.create);
router.put('/:id', tripController.update);
router.delete('/:id', tripController.remove);

module.exports = router;
