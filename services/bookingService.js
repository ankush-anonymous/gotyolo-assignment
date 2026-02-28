const { pool } = require('../db/connect');
const tripRepository = require('../repositories/tripRepository');
const bookingRepository = require('../repositories/bookingRepository');

async function createBooking(tripId, userId, numSeats, idempotencyKey = null) {
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
        idempotency_key: idempotencyKey,
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

module.exports = {
  createBooking,
};
