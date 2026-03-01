# gotyolo-assignment

Backend API for the GoTyolo travel booking platform (Node.js, Express, PostgreSQL).

---

## 1. Docker – Quick start

**Prerequisites:** Docker and Docker Compose installed.

### Build and run

```bash
docker compose up --build
```

#### What happens when you run this

| Order | Step | Service | What happens |
|-------|------|---------|--------------|
| 1 | **Postgres image** | db | Uses pre-built `postgres:16-alpine`. Container `gotyolo-db` starts, creates DB `gotyolo`, user `app`. Data stored in volume `pgdata`. |
| 2 | **Healthcheck** | db | Waits for `pg_isready` to pass. App will not start until DB is ready. |
| 3 | **Node image build** | app | Builds from `Dockerfile`: `node:20-alpine`, copies `package.json`, runs `npm ci`, copies source code. Produces image `gotyolo-app`. |
| 4 | **App container start** | app | Container `gotyolo-app` starts. It depends on `db` being healthy, so it waits for step 2. |
| 5 | **Schema** | app | Runs `node scripts/run-schema.js`: drops `bookings` and `trips` (if exist), recreates tables and enums from `schema.sql`. |
| 6 | **Seed** | app | Runs `node scripts/seed.js`: inserts 7 trips (incl. 2 at-risk) and ~17 bookings in various states. Updates `trips.available_seats`. |
| 7 | **API server** | app | Runs `node app.js`: connects to Postgres via `db:5432`, starts Express on port 5001, starts auto-expiry job (every 1 min). |
| 8 | **Ready** | — | API at `http://localhost:5001`. DB at `localhost:5432` (optional host access). |

### Stop and remove

```bash
docker compose down
```

### Reset DB and rebuild

```bash
docker compose down && docker compose up --build
```

### Reset DB (including data volume)

```bash
docker compose down -v && docker compose up --build
```

### Skip schema + seed on restart

Set `SKIP_SCHEMA_SEED=1` in the app service environment in `docker-compose.yml` if you only want to restart the app without reseeding.

**Base URL:** `http://localhost:5001`

---

## 2. Folder and file structure

```
gotyolo-assignment/
├── app.js                    # Entry point: Express, routes, DB check, scheduler
├── package.json
├── Dockerfile
├── docker-compose.yml
├── schema.sql                # DB schema (trips, bookings)
│
├── db/
│   └── connect.js            # PostgreSQL pool (from DATABASE_URL)
│
├── routers/
│   ├── index.js              # Mounts /trips, /payments, /bookings, /admin
│   ├── tripRouter.js         # /api/trips + POST /:tripId/book
│   ├── bookingRouter.js      # /api/bookings
│   ├── paymentsRouter.js     # /api/payments
│   └── adminRouter.js        # /admin/trips
│
├── controllers/
│   ├── tripController.js
│   ├── bookingController.js
│   ├── paymentController.js
│   └── adminTripController.js
│
├── services/
│   ├── bookingService.js     # Booking flow, cancel logic
│   └── paymentService.js     # Webhook processing, idempotency
│
├── repositories/
│   ├── tripRepository.js
│   ├── bookingRepository.js
│   └── adminTripRepository.js
│
├── jobs/
│   └── expireBookings.js     # Auto-expire PENDING_PAYMENT (every 1 min)
│
├── scripts/
│   ├── run-schema.js
│   ├── seed.js               # Full seed: trips + bookings (incl. at-risk)
│   ├── seed-trips.js         # Trips only
│   └── test-api.sh           # Curl smoke test
│
└── postman test files/       # Postman collections (Trips, Booking, Admin)
```

---

## 3. API overview – data flow

| Method | Path | Router | Controller | Service | Repository | Purpose |
|--------|------|--------|------------|---------|------------|---------|
| GET | /api/trips | tripRouter | tripController.getAll | — | tripRepository.findAll | All trips |
| GET | /api/trips/published | tripRouter | tripController.getPublished | — | tripRepository.findAllPublished | Published trips only |
| GET | /api/trips/:id | tripRouter | tripController.getById | — | tripRepository.findById | Trip by ID |
| POST | /api/trips | tripRouter | tripController.create | — | tripRepository.create | Create trip |
| PUT | /api/trips/:id | tripRouter | tripController.update | — | tripRepository.update | Update trip |
| DELETE | /api/trips/:id | tripRouter | tripController.remove | — | tripRepository.remove | Delete trip |
| POST | /api/trips/:tripId/book | tripRouter | bookingController.createBooking | bookingService.createBooking | tripRepository.getByIdForUpdate, decrementAvailableSeats; bookingRepository.create | Create booking (lock trip, decrement seats, insert) |
| GET | /api/bookings | bookingRouter | bookingController.getAll | bookingService.getAllBookings | bookingRepository.findAll | All bookings |
| GET | /api/bookings/:id | bookingRouter | bookingController.getById | bookingService.getBooking | bookingRepository.findById | Booking by ID |
| POST | /api/bookings/:id/cancel | bookingRouter | bookingController.cancel | bookingService.cancelBooking | bookingRepository.findByIdWithTrip, cancelBooking; tripRepository.incrementAvailableSeats | Cancel CONFIRMED or PENDING_PAYMENT (before cutoff) |
| POST | /api/payments/webhook | paymentsRouter | paymentController.webhook | paymentService.processWebhook | bookingRepository.findByIdempotencyKey, getByIdForUpdate, updateBookingState; tripRepository.incrementAvailableSeats (on failed) | Payment success/failed → CONFIRMED/EXPIRED |
| GET | /admin/trips/:tripId/metrics | adminRouter | adminTripController.getMetrics | — | adminTripRepository.getTripMetrics | Occupancy, booking_summary, financial |
| GET | /admin/trips/at-risk | adminRouter | adminTripController.getAtRisk | — | adminTripRepository.getAtRiskTrips | Trips: departure < 7 days, occupancy < 50% |

---

## 4. Testing guide (Postman)

**Import collections from `postman test files/`:** GoTyolo - Trips API, GoTyolo - Booking API, GoTyolo - Admin API.

Use a **PUBLISHED** trip for booking. Copy `id` from responses into `tripId` and `bookingId` as needed.

---

### Step 1 – Trips (read)

| # | Request | Collection | What to do |
|---|---------|------------|------------|
| 1 | Get All Trips | Trips | Send. Copy one trip `id` → set **tripId** in the collection (or in all three). |
| 2 | Get Published Trips | Trips | Send. Check only PUBLISHED trips are returned. |
| 3 | Get Trip By ID | Trips | Send (uses `tripId`). Check 200 and correct trip. |

---

### Step 2 – Trips (create/update/delete)

| # | Request | Collection | What to do |
|---|---------|------------|------------|
| 4 | Create Trip | Trips | Send. Copy returned `id` → set **tripId** (or keep step 1 ID for booking). |
| 5 | Update Trip | Trips | Change body (e.g. `title`, `price`, `status: "PUBLISHED"`). Send. Check 200. |
| 6 | Get Trip By ID | Trips | Send. Confirm updated fields. |
| 7 | Delete Trip | Trips | Optional: use a trip you don't need for bookings. Send. Then Get Trip By ID → 404. |

---

### Step 3 – Booking (full flow)

Use a **PUBLISHED** trip for `tripId` (e.g. from step 1 or the one you updated to PUBLISHED in step 5).

| # | Request | Collection | What to do |
|---|---------|------------|------------|
| 8 | Create Booking | Booking | Set **tripId** = PUBLISHED trip ID. Send. Copy returned `id` → set **bookingId**. Check 201, `state: "PENDING_PAYMENT"`, `payment_url`. |
| 9 | Get Booking By ID | Booking | Send. Check `state: "PENDING_PAYMENT"`. |
| 10 | Payment Webhook | Booking | Body: `"status": "success"` (and same `booking_id`, `idempotency_key`). Send. Check 200, `received: true`. |
| 11 | Get Booking By ID | Booking | Send again. Check `state: "CONFIRMED"`. |
| 12 | Cancel Booking | Booking | Send (same `bookingId`). Check 200, `cancelled: true`, `refund_amount` (if before cutoff). |
| 13 | Get Booking By ID | Booking | Send. Check `state: "CANCELLED"`. |

---

### Step 3b – Cancel PENDING_PAYMENT (before cutoff)

Cancel a booking **before** payment. Do **not** call Payment Webhook.

| # | Request | Collection | What to do |
|---|---------|------------|------------|
| 8a | Create Booking | Booking | Set **tripId** = PUBLISHED trip with start_date far ahead (e.g. Paris, April 2026). Send. Copy `id` → set **bookingId**. |
| 8b | Cancel PENDING_PAYMENT (before cutoff) | Booking | Send (do **not** call Payment Webhook first). Expect 200, `{ cancelled: true, refund_amount: 0 }`. Seats released. |
| 8c | Get Booking By ID | Booking | Send. Check `state: "CANCELLED"`. |

**Note:** Run within ~15 minutes of creating the booking; otherwise auto-expiry may set it to EXPIRED.

---

### Step 4 – Payment webhook (failed path)

| # | Request | Collection | What to do |
|---|---------|------------|------------|
| 14 | Create Booking | Booking | Use same or another PUBLISHED **tripId**. Send. Copy new `id` → set **bookingId**. |
| 15 | Payment Webhook | Booking | Body: `"status": "failed"`. Send. Check 200. |
| 16 | Get Booking By ID | Booking | Send. Check `state: "EXPIRED"`. |

---

### Step 5 – Admin

| # | Request | Collection | What to do |
|---|---------|------------|------------|
| 17 | Get Trip Metrics | Admin | Set **tripId** to any existing trip. Send. Check 200, `occupancy_percent`, `booking_summary`, `financial`. |
| 18 | Get At-Risk Trips | Admin | Send. Check 200, `at_risk_trips` (array; may be empty; seed includes at-risk trips). |

---

### Quick checklist

```
Trips:     Get All → Get Published → Get By ID → Create → Update → Get By ID [→ Delete]
Booking:   Create → Get → Webhook success → Get (CONFIRMED) → Cancel → Get (CANCELLED)
Cancel PENDING: Create → Cancel (no webhook) → Get (CANCELLED, refund_amount: 0)
Webhook:   Create → Webhook failed → Get (EXPIRED)
Admin:     Get Trip Metrics → Get At-Risk Trips
```

If you run through this order and every request returns the expected status and body, all features are in a working state.

---

## 5. Local setup (without Docker)

When running locally, you need a `.env` file to connect to Postgres. Docker does not use `.env` (it gets config from `docker-compose.yml`).

1. `npm install`
2. Create a `.env` file with `DATABASE_URL` – the connection string to your local Postgres:
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/dbname
   DATABASE_SSL=false
   ```
   Example: `DATABASE_URL=postgresql://app:appsecret@localhost:5432/gotyolo`. Set `DATABASE_SSL=false` for local Postgres without SSL.
3. `npm run schema` && `npm run seed`
4. `npm run dev` (port 5001)
