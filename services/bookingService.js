const crypto = require('crypto');
const { pool } = require('../db/connect');
const tripRepository = require('../repositories/tripRepository');
const bookingRepository = require('../repositories/bookingRepository');

async function createBooking(tripId, userId, numSeats, idempotencyKey = null) {
  const key = idempotencyKey && String(idempotencyKey).trim() ? idempotencyKey.trim() : crypto.randomUUID();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const trip = await tripRepository.getByIdForUpdate(tripId, client);
    if (!trip) {
      await client.query('ROLLBACK');
      return { error: 'TRIP_NOT_FOUND' };
    }
    if (trip.status !== 'PUBLISHED') {
      await client.query('ROLLBACK');
      return { error: 'TRIP_NOT_PUBLISHED' };
    }
    if (trip.available_seats < numSeats) {
      await client.query('ROLLBACK');
      return { error: 'NO_SEATS_AVAILABLE' };
    }

    const price_at_booking = Number(trip.price) * numSeats;
    const expires_at = new Date(Date.now() + 15 * 60 * 1000);

    await tripRepository.decrementAvailableSeats(tripId, numSeats, client);

    const booking = await bookingRepository.create(
      {
        trip_id: tripId,
        user_id: userId,
        num_seats: numSeats,
        price_at_booking,
        expires_at,
        idempotency_key: key,
      },
      client
    );

    await client.query('COMMIT');
    return { booking };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

async function getAllBookings() {
  return bookingRepository.findAll();
}

async function getBooking(bookingId) {
  return bookingRepository.findById(bookingId);
}

async function cancelBooking(bookingId) {
  const row = await bookingRepository.findByIdWithTrip(bookingId);
  if (!row) return { error: 'BOOKING_NOT_FOUND' };
  if (row.state === 'CANCELLED' || row.state === 'EXPIRED') {
    return { error: 'INVALID_STATE' };
  }

  const startDate = new Date(row.start_date);
  const daysMs = (row.refundable_until_days_before || 0) * 24 * 60 * 60 * 1000;
  const cutoffDate = new Date(startDate.getTime() - daysMs);
  const now = new Date();

  let refundAmount = 0;
  let releaseSeats = false;

  if (row.state === 'PENDING_PAYMENT') {
    if (now >= cutoffDate) {
      return { error: 'AFTER_CUTOFF' };
    }
    releaseSeats = true;
  } else if (row.state === 'CONFIRMED') {
    if (now < cutoffDate) {
      const price = Number(row.price_at_booking);
      const feePercent = Number(row.cancellation_fee_percent) || 0;
      refundAmount = Math.round(price * (1 - feePercent / 100) * 100) / 100;
      releaseSeats = true;
    }
  } else {
    return { error: 'INVALID_STATE' };
  }

  await bookingRepository.cancelBooking(
    bookingId,
    now,
    refundAmount,
    row.trip_id,
    row.num_seats,
    releaseSeats
  );
  return { cancelled: true, refund_amount: refundAmount };
}

module.exports = {
  createBooking,
  getAllBookings,
  getBooking,
  cancelBooking,
};
