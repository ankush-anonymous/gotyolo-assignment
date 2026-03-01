require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { pool } = require("./db/connect");
const routers = require("./routers");

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "gotyolo-assignment API" });
});

app.use("/api", routers);

const { runExpireJob } = require("./jobs/expireBookings");

async function start() {
  try {
    await pool.query("SELECT 1");
  } catch (err) {
    console.error("Database connection failed:", err.message);
    process.exit(1);
  }
  setInterval(() => runExpireJob().catch((err) => console.error("expire job:", err.message)), 60_000);
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();
