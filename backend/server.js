// dotenv must load before any other require so process.env is populated
// before modules like utils/db.js read DATABASE_URL/JWT_SECRET at require-time.
require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const assetRoutes = require('./routes/assetRoutes');
const auditRoutes = require('./routes/auditRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api', assetRoutes);
app.use('/api/audits', auditRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Ypsyl-own backend listening on port ${PORT} (Network accessible)`);
});