# gotyolo-assignment

## Running

**PostgreSQL (Docker)**  
`docker compose up -d` — runs Postgres only. Node server is not in Docker yet; a full compose stack will be added later.

**Node server (local)**  
Copy `.env.example` to `.env`, then `npm run dev`. Use `GET /health` to verify DB connection.
