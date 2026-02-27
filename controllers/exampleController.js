const exampleRepository = require('../repositories/exampleRepository');

async function getHealth(req, res) {
  try {
    const data = await exampleRepository.ping();
    res.json({ status: 'ok', database: 'connected', ...data });
  } catch (err) {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
}

module.exports = { getHealth };
