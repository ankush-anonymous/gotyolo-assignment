const express = require('express');
const bookingController = require('../controllers/bookingController');

const router = express.Router();

router.get('/', bookingController.getAll);
router.post('/:id/cancel', bookingController.cancel);
router.get('/:id', bookingController.getById);

module.exports = router;
