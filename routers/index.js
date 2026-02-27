const express = require('express');
const exampleRouter = require('./exampleRouter');
const tripRouter = require('./tripRouter');

const router = express.Router();

router.use('/example', exampleRouter);
router.use('/trips', tripRouter);

module.exports = router;
