const bookingService = require('../services/bookingService');

// Frontend: send num_seats, user_id. idempotency_key is optional; backend generates one if omitted.
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
    const paymentUrl = `https://pay.example.com/booking/${booking.id}?idempotency_key=${encodeURIComponent(booking.idempotency_key)}`;
    return res.status(201).json({
      ...booking,
      payment_url: paymentUrl,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function getAll(req, res) {
  try {
    const bookings = await bookingService.getAllBookings();
    return res.json(bookings);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function getById(req, res) {
  try {
    const booking = await bookingService.getBooking(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    return res.json(booking);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function cancel(req, res) {
  try {
    const result = await bookingService.cancelBooking(req.params.id);
    if (result.error === 'BOOKING_NOT_FOUND') {
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (result.error === 'INVALID_STATE') {
      return res.status(409).json({ error: 'Cannot cancel: booking is already CANCELLED or EXPIRED' });
    }
    if (result.error === 'AFTER_CUTOFF') {
      return res.status(409).json({ error: 'Cannot cancel PENDING_PAYMENT booking: trip is imminent (past refund cutoff)' });
    }
    return res.status(200).json({
      cancelled: result.cancelled,
      refund_amount: result.refund_amount,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = {
  createBooking,
  getAll,
  getById,
  cancel,
};
