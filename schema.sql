-- Drop existing tables and types (order: tables first, then enums)
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS trips;
DROP TYPE IF EXISTS booking_state_enum;
DROP TYPE IF EXISTS trip_status_enum;

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================
-- ENUM TYPES
-- =========================
CREATE TYPE trip_status_enum AS ENUM ('DRAFT', 'PUBLISHED');

CREATE TYPE booking_state_enum AS ENUM (
    'PENDING_PAYMENT',
    'CONFIRMED',
    'CANCELLED',
    'EXPIRED'
);

-- =========================
-- TRIPS TABLE
-- =========================
CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    max_capacity INTEGER NOT NULL CHECK (max_capacity > 0),
    available_seats INTEGER NOT NULL CHECK (available_seats >= 0),
    status trip_status_enum NOT NULL DEFAULT 'DRAFT',

    -- Refund policy (embedded)
    refundable_until_days_before INTEGER NOT NULL CHECK (refundable_until_days_before >= 0),
    cancellation_fee_percent INTEGER NOT NULL CHECK (cancellation_fee_percent BETWEEN 0 AND 100),

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Ensure available_seats never exceeds max_capacity
    CONSTRAINT chk_available_seats_capacity
        CHECK (available_seats <= max_capacity),

    -- Ensure end_date is after start_date
    CONSTRAINT chk_trip_dates
        CHECK (end_date > start_date)
);

CREATE INDEX idx_trips_start_date ON trips(start_date);
CREATE INDEX idx_trips_status ON trips(status);

-- =========================
-- BOOKINGS TABLE
-- =========================
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    trip_id UUID NOT NULL,
    user_id UUID NOT NULL,

    num_seats INTEGER NOT NULL CHECK (num_seats > 0),

    state booking_state_enum NOT NULL DEFAULT 'PENDING_PAYMENT',

    price_at_booking NUMERIC(12,2) NOT NULL CHECK (price_at_booking >= 0),

    payment_reference VARCHAR(255),

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    cancelled_at TIMESTAMP,

    refund_amount NUMERIC(12,2) CHECK (refund_amount >= 0),

    idempotency_key VARCHAR(255) UNIQUE,

    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Foreign key relation
    CONSTRAINT fk_booking_trip
        FOREIGN KEY (trip_id)
        REFERENCES trips(id)
        ON DELETE CASCADE,

    -- Expiry must be after creation
    CONSTRAINT chk_expiry_after_creation
        CHECK (expires_at > created_at)
);

CREATE INDEX idx_bookings_trip_id ON bookings(trip_id);
CREATE INDEX idx_bookings_state ON bookings(state);
CREATE INDEX idx_bookings_expires_at ON bookings(expires_at);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);