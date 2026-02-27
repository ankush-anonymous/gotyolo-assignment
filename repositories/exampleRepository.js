const { pool } = require('../db/connect');

async function ping() {
  const result = await pool.query('SELECT 1 AS ok');
  return result.rows[0];
}

module.exports = { ping };
