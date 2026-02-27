require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { pool } = require('../db/connect');

const dummyTrips = [
  {
    title: 'Paris City Tour',
    destination: 'Paris, France',
    start_date: new Date('2026-04-01T09:00:00Z'),
    end_date: new Date('2026-04-05T18:00:00Z'),
    price: 299.99,
    max_capacity: 20,
    status: 'PUBLISHED',
    refundable_until_days_before: 7,
    cancellation_fee_percent: 10,
  },
  {
    title: 'Tokyo Adventure',
    destination: 'Tokyo, Japan',
    start_date: new Date('2026-05-15T08:00:00Z'),
    end_date: new Date('2026-05-22T20:00:00Z'),
    price: 899.5,
    max_capacity: 12,
    status: 'PUBLISHED',
    refundable_until_days_before: 14,
    cancellation_fee_percent: 15,
  },
  {
    title: 'Bali Beach Escape',
    destination: 'Bali, Indonesia',
    start_date: new Date('2026-06-01T10:00:00Z'),
    end_date: new Date('2026-06-08T10:00:00Z'),
    price: 549.0,
    max_capacity: 15,
    status: 'DRAFT',
    refundable_until_days_before: 5,
    cancellation_fee_percent: 20,
  },
  {
    title: 'New York Weekend',
    destination: 'New York, USA',
    start_date: new Date('2026-07-10T14:00:00Z'),
    end_date: new Date('2026-07-12T22:00:00Z'),
    price: 399.0,
    max_capacity: 8,
    status: 'PUBLISHED',
    refundable_until_days_before: 3,
    cancellation_fee_percent: 25,
  },
  {
    title: 'Rome Heritage Tour',
    destination: 'Rome, Italy',
    start_date: new Date('2026-08-20T09:00:00Z'),
    end_date: new Date('2026-08-25T18:00:00Z'),
    price: 679.0,
    max_capacity: 18,
    status: 'PUBLISHED',
    refundable_until_days_before: 10,
    cancellation_fee_percent: 10,
  },
];

const insertTrip = `INSERT INTO trips (
  title, destination, start_date, end_date, price, max_capacity, available_seats,
  status, refundable_until_days_before, cancellation_fee_percent
) VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8, $9)
RETURNING id, title, destination, start_date, end_date, price, max_capacity, available_seats, status, created_at`;

async function seedTrips() {
  const client = await pool.connect();
  try {
    for (const t of dummyTrips) {
      await client.query(insertTrip, [
        t.title,
        t.destination,
        t.start_date,
        t.end_date,
        t.price,
        t.max_capacity,
        t.status,
        t.refundable_until_days_before,
        t.cancellation_fee_percent,
      ]);
    }
    console.log(`Seeded ${dummyTrips.length} trips.`);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedTrips();
