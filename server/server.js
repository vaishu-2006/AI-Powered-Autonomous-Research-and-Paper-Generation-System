require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    const allowed = new Set([
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      process.env.CLIENT_URL
    ].filter(Boolean));
    if (!origin || allowed.has(origin)) return callback(null, true);
    callback(new Error('CORS origin not allowed'));
  },
  credentials: true
}));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/research', require('./routes/research'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/papers', require('./routes/papers'));
app.use('/api/export', require('./routes/export'));
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use(errorHandler);

async function start() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not configured');
  await mongoose.connect(process.env.MONGODB_URI);
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`ResearchAI server listening on http://localhost:${port}`));
}

if (require.main === module) start().catch(error => { console.error(error.message); process.exit(1); });
module.exports = app;
