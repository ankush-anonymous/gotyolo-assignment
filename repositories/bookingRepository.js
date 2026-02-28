const { pool } = require('../db/connect');

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

module.exports = {
  create,
  findById,
  findByIdempotencyKey,
};
