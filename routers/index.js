const express = require('express');
const exampleRouter = require('./exampleRouter');

const router = express.Router();

router.use('/example', exampleRouter);

module.exports = router;
