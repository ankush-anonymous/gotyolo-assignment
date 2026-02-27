const express = require('express');
const exampleController = require('../controllers/exampleController');

const router = express.Router();

router.get('/health', exampleController.getHealth);

module.exports = router;
