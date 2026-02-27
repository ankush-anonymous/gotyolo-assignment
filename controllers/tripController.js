const tripRepository = require('../repositories/tripRepository');

async function getAll(req, res) {
  try {
    const trips = await tripRepository.findAll();
    res.json(trips);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getPublished(req, res) {
  try {
    const trips = await tripRepository.findAllPublished();
    res.json(trips);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getById(req, res) {
  try {
    const trip = await tripRepository.findById(req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    res.json(trip);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function create(req, res) {
  try {
    const body = req.body;
    if (!body.title || !body.destination || !body.start_date || !body.end_date || body.price == null || body.max_capacity == null || body.refundable_until_days_before == null || body.cancellation_fee_percent == null) {
      return res.status(400).json({ error: 'Missing required fields: title, destination, start_date, end_date, price, max_capacity, refundable_until_days_before, cancellation_fee_percent' });
    }
    const trip = await tripRepository.create({
      title: body.title,
      destination: body.destination,
      start_date: body.start_date,
      end_date: body.end_date,
      price: parseFloat(body.price),
      max_capacity: parseInt(body.max_capacity, 10),
      status: body.status || 'DRAFT',
      refundable_until_days_before: parseInt(body.refundable_until_days_before, 10),
      cancellation_fee_percent: parseInt(body.cancellation_fee_percent, 10),
    });
    res.status(201).json(trip);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function update(req, res) {
  try {
    const existing = await tripRepository.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Trip not found' });
    const body = req.body;
    const trip = await tripRepository.update(req.params.id, {
      title: body.title,
      destination: body.destination,
      start_date: body.start_date,
      end_date: body.end_date,
      price: body.price != null ? parseFloat(body.price) : undefined,
      max_capacity: body.max_capacity != null ? parseInt(body.max_capacity, 10) : undefined,
      status: body.status,
      refundable_until_days_before: body.refundable_until_days_before != null ? parseInt(body.refundable_until_days_before, 10) : undefined,
      cancellation_fee_percent: body.cancellation_fee_percent != null ? parseInt(body.cancellation_fee_percent, 10) : undefined,
    });
    res.json(trip);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function remove(req, res) {
  try {
    const deleted = await tripRepository.remove(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Trip not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getAll,
  getPublished,
  getById,
  create,
  update,
  remove,
};
