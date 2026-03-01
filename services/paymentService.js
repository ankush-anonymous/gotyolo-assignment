const { pool } = require('../db/connect');
const bookingRepository = require('../repositories/bookingRepository');
const tripRepository = require('../repositories/tripRepository');

/**
 * Process payment webhook. Idempotent: duplicate idempotency_key or already CONFIRMED/EXPIRED returns without error.
 * Always returns a result object; never throws (caller responds 200 either way).
 */
async function processWebhook(bookingId, status, idempotencyKey, paymentReference = null) {
  if (idempotencyKey) {
    const existing = await bookingRepository.findByIdempotencyKey(idempotencyKey);
    if (existing && (existing.state === 'CONFIRMED' || existing.state === 'EXPIRED')) {
      return { received: true, idempotent: true };
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const booking = await bookingRepository.getByIdForUpdate(bookingId, client);
    if (!booking) {
      await client.query('ROLLBACK');
      return { received: true, invalid: true };
    }
    if (booking.state !== 'PENDING_PAYMENT') {
      await client.query('ROLLBACK');
      return { received: true, idempotent: true };
    }

    if (status === 'success') {
      await bookingRepository.updateBookingState(bookingId, 'CONFIRMED', paymentReference, client);
    } else if (status === 'failed') {
      await bookingRepository.updateBookingState(bookingId, 'EXPIRED', null, client);
      await tripRepository.incrementAvailableSeats(booking.trip_id, booking.num_seats, client);
    }

    await client.query('COMMIT');
    return { received: true, processed: true };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return { received: true, error: err.message };
  } finally {
    client.release();
  }
}

module.exports = {
  processWebhook,
};
