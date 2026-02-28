const bookingService = require('../services/bookingService');

async function createBooking(req, res) {
  const tripId = req.params.tripId;
  const { num_seats, user_id, idempotency_key } = req.body;

  const numSeats = num_seats != null ? parseInt(num_seats, 10) : NaN;
  if (!Number.isInteger(numSeats) || numSeats < 1) {
    return res.status(400).json({ error: 'num_seats must be a positive integer' });
  }

  const userId = user_id || null;
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'user_id is required' });
  }

  try {
    const result = await bookingService.createBooking(
      tripId,
      userId,
      numSeats,
      idempotency_key ?? null
    );

    if (result.error === 'TRIP_NOT_FOUND') {
      return res.status(409).json({ error: 'Trip not found' });
    }
    if (result.error === 'TRIP_NOT_PUBLISHED') {
      return res.status(409).json({ error: 'Trip is not published for booking' });
    }
    if (result.error === 'NO_SEATS_AVAILABLE') {
      return res.status(409).json({ error: 'No seats available' });
    }

    const booking = result.booking;
    return res.status(201).json({
      ...booking,
      payment_url: `https://pay.example.com/booking/${booking.id}`,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = {
  createBooking,
};
