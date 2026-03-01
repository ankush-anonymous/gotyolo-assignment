const express = require("express");
const adminTripController = require("../controllers/adminTripController");

const router = express.Router();

router.get("/trips/at-risk", adminTripController.getAtRisk);
router.get("/trips/:tripId/metrics", adminTripController.getMetrics);

module.exports = router;
