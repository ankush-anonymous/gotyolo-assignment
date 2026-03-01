/**
 * Full seed: 3–5 trips + 10–15 bookings in various states.
 * Includes 2 at-risk trips (departure in 7 days, occupancy < 50%) for GET /admin/trips/at-risk.
 * Run after schema: npm run schema && npm run seed
 * Keeps trips.available_seats consistent with CONFIRMED + PENDING_PAYMENT bookings.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { pool } = require('../db/connect');

const now = new Date();
const inDays = (d) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

const dummyTrips = [
  // At-risk: departure in 3 days, low occupancy (2/20 = 10%)
  { title: 'Last-Minute Alps Hike', destination: 'Swiss Alps', start_date: inDays(3), end_date: inDays(5), price: 450, max_capacity: 20, status: 'PUBLISHED', refundable_until_days_before: 2, cancellation_fee_percent: 20 },
  // At-risk: departure in 6 days, low occupancy (3/15 = 20%)
  { title: 'Weekend Coastal Getaway', destination: 'Amalfi Coast', start_date: inDays(6), end_date: inDays(8), price: 620, max_capacity: 15, status: 'PUBLISHED', refundable_until_days_before: 1, cancellation_fee_percent: 25 },
  { title: 'Paris City Tour', destination: 'Paris, France', start_date: new Date('2026-04-01T09:00:00Z'), end_date: new Date('2026-04-05T18:00:00Z'), price: 299.99, max_capacity: 20, status: 'PUBLISHED', refundable_until_days_before: 7, cancellation_fee_percent: 10 },
  { title: 'Tokyo Adventure', destination: 'Tokyo, Japan', start_date: new Date('2026-05-15T08:00:00Z'), end_date: new Date('2026-05-22T20:00:00Z'), price: 899.5, max_capacity: 12, status: 'PUBLISHED', refundable_until_days_before: 14, cancellation_fee_percent: 15 },
  { title: 'Bali Beach Escape', destination: 'Bali, Indonesia', start_date: new Date('2026-06-01T10:00:00Z'), end_date: new Date('2026-06-08T10:00:00Z'), price: 549.0, max_capacity: 15, status: 'DRAFT', refundable_until_days_before: 5, cancellation_fee_percent: 20 },
  { title: 'New York Weekend', destination: 'New York, USA', start_date: new Date('2026-07-10T14:00:00Z'), end_date: new Date('2026-07-12T22:00:00Z'), price: 399.0, max_capacity: 8, status: 'PUBLISHED', refundable_until_days_before: 3, cancellation_fee_percent: 25 },
  { title: 'Rome Heritage Tour', destination: 'Rome, Italy', start_date: new Date('2026-08-20T09:00:00Z'), end_date: new Date('2026-08-25T18:00:00Z'), price: 679.0, max_capacity: 18, status: 'PUBLISHED', refundable_until_days_before: 10, cancellation_fee_percent: 10 },
];

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';

const insertTrip = `INSERT INTO trips (
  title, destination, start_date, end_date, price, max_capacity, available_seats,
  status, refundable_until_days_before, cancellation_fee_percent
) VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8, $9)
RETURNING id, max_capacity`;

const insertBooking = `INSERT INTO bookings (
  trip_id, user_id, num_seats, state, price_at_booking, expires_at, idempotency_key, payment_reference, cancelled_at, refund_amount
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`;

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const tripIds = [];
    for (const t of dummyTrips) {
      const r = await client.query(insertTrip, [
        t.title, t.destination, t.start_date, t.end_date, t.price, t.max_capacity, t.status,
        t.refundable_until_days_before, t.cancellation_fee_percent,
      ]);
      tripIds.push({ id: r.rows[0].id, max_capacity: r.rows[0].max_capacity, price: t.price });
    }
    console.log(`Seeded ${tripIds.length} trips.`);

    const expiresAt = new Date(now.getTime() + 20 * 60 * 1000); // future so expires_at > created_at

    const bookings = [
      // At-risk trip 0 (Alps): 2 booked of 20 = 10% occupancy
      { tripIdx: 0, num_seats: 2, state: 'CONFIRMED', price: 450 * 2, idem: 'seed-idem-atrisk-1', pay_ref: 'pay_at1', cancelled_at: null, refund_amount: null },
      // At-risk trip 1 (Amalfi): 3 booked of 15 = 20% occupancy
      { tripIdx: 1, num_seats: 2, state: 'CONFIRMED', price: 620 * 2, idem: 'seed-idem-atrisk-2', pay_ref: 'pay_at2', cancelled_at: null, refund_amount: null },
      { tripIdx: 1, num_seats: 1, state: 'PENDING_PAYMENT', price: 620, idem: 'seed-idem-atrisk-3', pay_ref: null, cancelled_at: null, refund_amount: null },
      // Paris (tripIdx 2)
      { tripIdx: 2, num_seats: 2, state: 'CONFIRMED', price: 299.99 * 2, idem: 'seed-idem-1', pay_ref: 'pay_1', cancelled_at: null, refund_amount: null },
      { tripIdx: 2, num_seats: 1, state: 'PENDING_PAYMENT', price: 299.99, idem: 'seed-idem-2', pay_ref: null, cancelled_at: null, refund_amount: null },
      { tripIdx: 2, num_seats: 3, state: 'CANCELLED', price: 299.99 * 3, idem: 'seed-idem-3', pay_ref: 'pay_3', cancelled_at: now, refund_amount: (299.99 * 3 * 0.9).toFixed(2) },
      { tripIdx: 2, num_seats: 1, state: 'EXPIRED', price: 299.99, idem: 'seed-idem-4', pay_ref: null, cancelled_at: null, refund_amount: null },
      // Tokyo (tripIdx 3)
      { tripIdx: 3, num_seats: 2, state: 'CONFIRMED', price: 899.5 * 2, idem: 'seed-idem-5', pay_ref: 'pay_5', cancelled_at: null, refund_amount: null },
      { tripIdx: 3, num_seats: 1, state: 'PENDING_PAYMENT', price: 899.5, idem: 'seed-idem-6', pay_ref: null, cancelled_at: null, refund_amount: null },
      { tripIdx: 3, num_seats: 2, state: 'CANCELLED', price: 899.5 * 2, idem: 'seed-idem-7', pay_ref: 'pay_7', cancelled_at: now, refund_amount: (899.5 * 2 * 0.85).toFixed(2) },
      // Bali (tripIdx 4)
      { tripIdx: 4, num_seats: 4, state: 'CONFIRMED', price: 549 * 4, idem: 'seed-idem-8', pay_ref: 'pay_8', cancelled_at: null, refund_amount: null },
      // New York (tripIdx 5)
      { tripIdx: 5, num_seats: 2, state: 'CONFIRMED', price: 399 * 2, idem: 'seed-idem-9', pay_ref: 'pay_9', cancelled_at: null, refund_amount: null },
      { tripIdx: 5, num_seats: 1, state: 'EXPIRED', price: 399, idem: 'seed-idem-10', pay_ref: null, cancelled_at: null, refund_amount: null },
      // Rome (tripIdx 6)
      { tripIdx: 6, num_seats: 5, state: 'CONFIRMED', price: 679 * 5, idem: 'seed-idem-11', pay_ref: 'pay_11', cancelled_at: null, refund_amount: null },
      { tripIdx: 6, num_seats: 2, state: 'PENDING_PAYMENT', price: 679 * 2, idem: 'seed-idem-12', pay_ref: null, cancelled_at: null, refund_amount: null },
      { tripIdx: 6, num_seats: 3, state: 'CANCELLED', price: 679 * 3, idem: 'seed-idem-13', pay_ref: 'pay_13', cancelled_at: now, refund_amount: (679 * 3 * 0.9).toFixed(2) },
    ];

    for (const b of bookings) {
      const trip = tripIds[b.tripIdx];
      await client.query(insertBooking, [
        trip.id, USER_ID, b.num_seats, b.state, b.price, expiresAt, b.idem, b.pay_ref, b.cancelled_at, b.refund_amount,
      ]);
    }
    console.log(`Seeded ${bookings.length} bookings.`);

    await client.query(`
      UPDATE trips t SET available_seats = t.max_capacity - COALESCE((
        SELECT SUM(b.num_seats) FROM bookings b
        WHERE b.trip_id = t.id AND b.state IN ('CONFIRMED', 'PENDING_PAYMENT')
      ), 0)
    `);
    console.log('Updated trips.available_seats to match CONFIRMED + PENDING_PAYMENT bookings.');

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
