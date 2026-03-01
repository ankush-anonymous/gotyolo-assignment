const express = require('express');
const paymentController = require('../controllers/paymentController');

const router = express.Router();

router.post('/webhook', paymentController.webhook);

module.exports = router;
