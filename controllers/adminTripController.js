const adminTripRepository = require("../repositories/adminTripRepository");

async function getMetrics(req, res) {
  try {
    const tripId = req.params.tripId;
    const metrics = await adminTripRepository.getTripMetrics(tripId);
    if (!metrics) return res.status(404).json({ error: "Trip not found" });
    res.json(metrics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getAtRisk(req, res) {
  try {
    const atRiskTrips = await adminTripRepository.getAtRiskTrips();
    res.json({ at_risk_trips: atRiskTrips });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getMetrics,
  getAtRisk,
};
