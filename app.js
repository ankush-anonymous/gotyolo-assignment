const express = require('express');
const cors = require('cors');
const routers = require('./routers');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'gotyolo-assignment API' });
});

app.use('/api', routers);

app.PORT = PORT;
module.exports = app;
