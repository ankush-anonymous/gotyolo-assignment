# gotyolo-assignment

Backend API for the GoTyolo travel booking platform (Node.js, Express, PostgreSQL).

## Setup (local)

1. Clone and install: `npm install`
2. Create `.env` from `.env.example` and set `DATABASE_URL` (and `DATABASE_SSL=false` for local Postgres without SSL).
3. Apply schema and seed:
   - `npm run schema`
   - `npm run seed` (full seed: trips + bookings) or `npm run seed-trips` (trips only)
4. Start: `npm run dev` (default port 5001)

## Run with Docker

```bash
docker compose up --build
```

- **db**: Postgres 16 on port 5432 (user `app`, password `appsecret`, db `gotyolo`).
- **app**: API on port 5001. On first start it runs schema + seed, then starts the server.
- To skip schema+seed on start: set env `SKIP_SCHEMA_SEED=1` for the app service.

Stop: `docker compose down`

## Test the API

**Base URL:** `http://localhost:5001` (or `http://localhost:3000` if you set `PORT=3000`)

**Postman:** Import collections from `postman test files/`:

- **GoTyolo - Trips API** – CRUD trips, base URL `http://localhost:5001/api`
- **GoTyolo - Booking API** – create booking, get/cancel, payment webhook; set `tripId` / `bookingId` from responses
- **GoTyolo - Admin API** – trip metrics, at-risk trips; base URL `http://localhost:5001`, set `tripId` from a trip

**curl (smoke test):**

```bash
# Root
curl http://localhost:5001/

# Trips
curl http://localhost:5001/api/trips
curl http://localhost:5001/api/trips/published

# Bookings (after seed)
curl http://localhost:5001/api/bookings

# Admin (use a real trip UUID from /api/trips for metrics)
curl http://localhost:5001/admin/trips/at-risk
TRIP_ID=$(curl -s http://localhost:5001/api/trips | node -e "const d=require('fs').readFileSync(0,'utf8'); const j=JSON.parse(d); console.log(j[0]?.id||'')")
curl "http://localhost:5001/admin/trips/${TRIP_ID}/metrics"
```

Or run the script (after `chmod +x scripts/test-api.sh`):

```bash
./scripts/test-api.sh
```

## Main endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/trips | All trips |
| GET | /api/trips/published | Published trips only |
| GET | /api/trips/:id | Trip by ID |
| POST | /api/trips/:tripId/book | Create booking (body: `num_seats`, `user_id`) |
| GET | /api/bookings | All bookings |
| GET | /api/bookings/:id | Booking by ID |
| POST | /api/bookings/:id/cancel | Cancel CONFIRMED booking |
| POST | /api/payments/webhook | Payment webhook (body: `booking_id`, `status`, `idempotency_key`) |
| GET | /admin/trips/:tripId/metrics | Trip metrics and financials |
| GET | /admin/trips/at-risk | Trips at risk (departure &lt; 7 days, occupancy &lt; 50%) |
