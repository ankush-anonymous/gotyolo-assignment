const bookingRepository = require('../repositories/bookingRepository');

async function runExpireJob() {
  const rows = await bookingRepository.findExpiredPendingBookings();
  for (const row of rows) {
    try {
      await bookingRepository.expireBooking(row.id);
    } catch (err) {
      console.error('[expireBookings] Failed to expire booking', row.id, err.message);
    }
  }
}

module.exports = { runExpireJob };
