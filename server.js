require('dotenv').config();
const app = require('./app');
const { connectToDatabase } = require('./utils/db');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const MONGODB_URI = process.env.MONGODB_URI;

(async () => {
  try {
    const conn = await connectToDatabase(MONGODB_URI);
    logger.info('Database connected', { host: conn.host, name: conn.name });

    app.listen(PORT, HOST, () => {
      const url = HOST === '0.0.0.0' || HOST === '::' ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;
      logger.info('Server started', { host: HOST, port: PORT, url, env: process.env.NODE_ENV || 'development' });
    });
  } catch (error) {
    logger.error('Startup failure', { reason: error.message, stack: error.stack });
    process.exit(1);
  }
})();


