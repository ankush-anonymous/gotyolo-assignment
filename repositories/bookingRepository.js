const { pool } = require('../db/connect');
const tripRepository = require('./tripRepository');

async function create(data, client) {
  const runner = client || pool;
  const {
    trip_id,
    user_id,
    num_seats,
    price_at_booking,
    expires_at,
    idempotency_key,
  } = data;
  const result = await runner.query(
    `INSERT INTO bookings (trip_id, user_id, num_seats, state, price_at_booking, expires_at, idempotency_key)
     VALUES ($1, $2, $3, 'PENDING_PAYMENT', $4, $5, $6)
     RETURNING *`,
    [trip_id, user_id, num_seats, price_at_booking, expires_at, idempotency_key ?? null]
  );
  return result.rows[0];
}

async function findAll() {
  const result = await pool.query('SELECT * FROM bookings ORDER BY created_at DESC');
  return result.rows;
}

async function findById(bookingId) {
  const result = await pool.query('SELECT * FROM bookings WHERE id = $1', [bookingId]);
  return result.rows[0] || null;
}

async function findByIdempotencyKey(key) {
  const result = await pool.query(
    'SELECT id, state FROM bookings WHERE idempotency_key = $1',
    [key]
  );
  return result.rows[0] || null;
}

async function getByIdForUpdate(bookingId, client) {
  const runner = client || pool;
  const result = await runner.query(
    'SELECT id, trip_id, num_seats, state FROM bookings WHERE id = $1 FOR UPDATE',
    [bookingId]
  );
  return result.rows[0] || null;
}

async function updateBookingState(bookingId, state, paymentReference, client) {
  const runner = client || pool;
  const result = await runner.query(
    `UPDATE bookings SET state = $2, payment_reference = COALESCE($3, payment_reference), updated_at = NOW() WHERE id = $1 RETURNING id`,
    [bookingId, state, paymentReference ?? null]
  );
  return result.rowCount > 0;
}

async function findByIdWithTrip(bookingId) {
  const result = await pool.query(
    `SELECT b.*, t.start_date, t.refundable_until_days_before, t.cancellation_fee_percent
     FROM bookings b
     JOIN trips t ON b.trip_id = t.id
     WHERE b.id = $1`,
    [bookingId]
  );
  return result.rows[0] || null;
}

async function findExpiredPendingBookings() {
  const result = await pool.query(
    `SELECT id, trip_id, num_seats FROM bookings
     WHERE state = 'PENDING_PAYMENT' AND expires_at < NOW()
     ORDER BY expires_at ASC`
  );
  return result.rows;
}

async function expireBooking(bookingId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const booking = await getByIdForUpdate(bookingId, client);
    if (!booking || booking.state !== 'PENDING_PAYMENT') {
      await client.query('ROLLBACK');
      return;
    }
    await updateBookingState(bookingId, 'EXPIRED', null, client);
    await tripRepository.incrementAvailableSeats(booking.trip_id, booking.num_seats, client);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

async function cancelBooking(bookingId, cancelledAt, refundAmount, tripId, numSeats, releaseSeats) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE bookings SET state = 'CANCELLED', cancelled_at = $2, refund_amount = $3, updated_at = NOW() WHERE id = $1`,
      [bookingId, cancelledAt, refundAmount]
    );
    if (releaseSeats && tripId != null && numSeats != null) {
      await tripRepository.incrementAvailableSeats(tripId, numSeats, client);
    }
    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  create,
  findAll,
  findById,
  findByIdempotencyKey,
  getByIdForUpdate,
  updateBookingState,
  findByIdWithTrip,
  findExpiredPendingBookings,
  expireBooking,
  cancelBooking,
};
