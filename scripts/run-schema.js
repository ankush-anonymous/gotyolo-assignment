require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { pool } = require('../db/connect');
const fs = require('fs');
const path = require('path');

async function runSchema() {
  const schemaPath = path.resolve(__dirname, '../schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log('Schema applied successfully.');
  } catch (err) {
    console.error('Schema run failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runSchema();
