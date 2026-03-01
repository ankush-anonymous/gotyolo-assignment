#!/bin/sh
# Quick API smoke test with curl. Set BASE_URL (default http://localhost:5001) and ensure server is running.
BASE_URL="${BASE_URL:-http://localhost:5001}"

echo "=== Root ==="
curl -s "${BASE_URL}/" | head -1

echo "\n=== GET /api/trips (all) ==="
curl -s "${BASE_URL}/api/trips" | head -c 200

echo "\n\n=== GET /api/trips/published ==="
curl -s "${BASE_URL}/api/trips/published" | head -c 200

echo "\n\n=== GET /api/bookings ==="
curl -s "${BASE_URL}/api/bookings" | head -c 200

echo "\n\n=== GET /admin/trips/at-risk ==="
curl -s "${BASE_URL}/admin/trips/at-risk"

echo "\n"
