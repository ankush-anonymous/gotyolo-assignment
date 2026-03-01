const { pool } = require("../db/connect");

function buildBookingSummary(rows) {
  const summary = { confirmed: 0, pending_payment: 0, cancelled: 0, expired: 0 };
  for (const row of rows) {
    const state = (row.state || "").toUpperCase();
    const cnt = Number(row.cnt) || 0;
    if (state === "CONFIRMED") summary.confirmed = cnt;
    else if (state === "PENDING_PAYMENT") summary.pending_payment = cnt;
    else if (state === "CANCELLED") summary.cancelled = cnt;
    else if (state === "EXPIRED") summary.expired = cnt;
  }
  return summary;
}

async function getTripMetrics(tripId) {
  const tripResult = await pool.query(
    `SELECT id, title, max_capacity, available_seats
     FROM trips WHERE id = $1`,
    [tripId]
  );
  const trip = tripResult.rows[0];
  if (!trip) return null;

  const totalSeats = Number(trip.max_capacity) || 0;
  const availableSeats = Number(trip.available_seats) ?? 0;
  const bookedSeats = totalSeats - availableSeats;
  const occupancyPercent =
    totalSeats > 0 ? Math.round((bookedSeats / totalSeats) * 100) : 0;

  const summaryResult = await pool.query(
    `SELECT state, COUNT(*) AS cnt FROM bookings WHERE trip_id = $1 GROUP BY state`,
    [tripId]
  );
  const bookingSummary = buildBookingSummary(summaryResult.rows);

  const financialResult = await pool.query(
    `SELECT
       COALESCE(SUM(CASE WHEN state = 'CONFIRMED' THEN price_at_booking ELSE 0 END), 0) AS gross_revenue,
       COALESCE(SUM(refund_amount), 0) AS refunds_issued
     FROM bookings WHERE trip_id = $1`,
    [tripId]
  );
  const row = financialResult.rows[0];
  const grossRevenue = Number(row?.gross_revenue) || 0;
  const refundsIssued = Number(row?.refunds_issued) || 0;
  const netRevenue = grossRevenue - refundsIssued;

  return {
    trip_id: trip.id,
    title: trip.title,
    occupancy_percent: occupancyPercent,
    total_seats: totalSeats,
    booked_seats: bookedSeats,
    available_seats: availableSeats,
    booking_summary: bookingSummary,
    financial: {
      gross_revenue: grossRevenue,
      refunds_issued: refundsIssued,
      net_revenue: netRevenue,
    },
  };
}

async function getAtRiskTrips() {
  const result = await pool.query(
    `SELECT id, title, start_date, max_capacity, available_seats
     FROM trips
     WHERE start_date >= NOW() AND start_date < NOW() + INTERVAL '7 days'
     ORDER BY start_date ASC`
  );

  const atRiskTrips = [];
  for (const row of result.rows) {
    const maxCapacity = Number(row.max_capacity) || 0;
    const availableSeats = Number(row.available_seats) ?? 0;
    const bookedSeats = maxCapacity - availableSeats;
    const occupancyPercent =
      maxCapacity > 0 ? Math.round((bookedSeats / maxCapacity) * 100) : 0;

    if (occupancyPercent >= 50) continue;

    const startDate = row.start_date;
    const departureDate =
      startDate instanceof Date
        ? startDate.toISOString().slice(0, 10)
        : String(startDate).slice(0, 10);

    atRiskTrips.push({
      trip_id: row.id,
      title: row.title,
      departure_date: departureDate,
      occupancy_percent: occupancyPercent,
      reason: "Low occupancy with imminent departure",
    });
  }

  return atRiskTrips;
}

module.exports = {
  getTripMetrics,
  getAtRiskTrips,
};
