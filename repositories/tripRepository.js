const { pool } = require('../db/connect');

async function findAllPublished() {
  const result = await pool.query(
    `SELECT id, title, destination, start_date, end_date, price, max_capacity, available_seats, status, created_at
     FROM trips WHERE status = 'PUBLISHED' ORDER BY start_date ASC`
  );
  return result.rows;
}

async function findAll() {
  const result = await pool.query(
    `SELECT id, title, destination, start_date, end_date, price, max_capacity, available_seats, status,
            refundable_until_days_before, cancellation_fee_percent, created_at, updated_at
     FROM trips ORDER BY start_date ASC`
  );
  return result.rows;
}

async function findById(id) {
  const result = await pool.query(
    `SELECT id, title, destination, start_date, end_date, price, max_capacity, available_seats, status,
            refundable_until_days_before, cancellation_fee_percent, created_at, updated_at
     FROM trips WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function create(data) {
  const {
    title,
    destination,
    start_date,
    end_date,
    price,
    max_capacity,
    status = 'DRAFT',
    refundable_until_days_before,
    cancellation_fee_percent,
  } = data;
  const result = await pool.query(
    `INSERT INTO trips (title, destination, start_date, end_date, price, max_capacity, available_seats, status, refundable_until_days_before, cancellation_fee_percent)
     VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8, $9)
     RETURNING id, title, destination, start_date, end_date, price, max_capacity, available_seats, status, created_at`,
    [
      title,
      destination,
      start_date,
      end_date,
      price,
      max_capacity,
      status,
      refundable_until_days_before,
      cancellation_fee_percent,
    ]
  );
  return result.rows[0];
}

async function update(id, data) {
  const {
    title,
    destination,
    start_date,
    end_date,
    price,
    max_capacity,
    status,
    refundable_until_days_before,
    cancellation_fee_percent,
  } = data;
  const result = await pool.query(
    `UPDATE trips SET
       title = COALESCE($2, title),
       destination = COALESCE($3, destination),
       start_date = COALESCE($4, start_date),
       end_date = COALESCE($5, end_date),
       price = COALESCE($6, price),
       max_capacity = COALESCE($7, max_capacity),
       status = COALESCE($8, status),
       refundable_until_days_before = COALESCE($9, refundable_until_days_before),
       cancellation_fee_percent = COALESCE($10, cancellation_fee_percent),
       updated_at = NOW()
     WHERE id = $1
     RETURNING id, title, destination, start_date, end_date, price, max_capacity, available_seats, status, created_at, updated_at`,
    [
      id,
      title,
      destination,
      start_date,
      end_date,
      price,
      max_capacity,
      status,
      refundable_until_days_before,
      cancellation_fee_percent,
    ]
  );
  return result.rows[0] || null;
}

async function remove(id) {
  const result = await pool.query('DELETE FROM trips WHERE id = $1 RETURNING id', [id]);
  return result.rowCount > 0;
}

async function getByIdForUpdate(tripId, client) {
  const runner = client || pool;
  const result = await runner.query(
    `SELECT id, title, price, max_capacity, available_seats, status
     FROM trips WHERE id = $1 FOR UPDATE`,
    [tripId]
  );
  return result.rows[0] || null;
}

async function decrementAvailableSeats(tripId, numSeats, client) {
  const runner = client || pool;
  const result = await runner.query(
    `UPDATE trips SET available_seats = available_seats - $1, updated_at = NOW() WHERE id = $2`,
    [numSeats, tripId]
  );
  return result.rowCount;
}

module.exports = {
  findAllPublished,
  findAll,
  findById,
  create,
  update,
  remove,
  getByIdForUpdate,
  decrementAvailableSeats,
};
