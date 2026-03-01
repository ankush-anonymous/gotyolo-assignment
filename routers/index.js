const express = require('express');
const exampleRouter = require('./exampleRouter');
const tripRouter = require('./tripRouter');
const paymentsRouter = require('./paymentsRouter');
const bookingRouter = require('./bookingRouter');

const router = express.Router();

router.use('/example', exampleRouter);
router.use('/trips', tripRouter);
router.use('/payments', paymentsRouter);
router.use('/bookings', bookingRouter);

module.exports = router;
