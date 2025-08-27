const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const apiRouter = require('./routers');
const { createRateLimiter } = require('./middleware/rateLimit');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { auditMiddleware } = require('./middleware/audit');

// Initialize and export the Express application instance.
function createApp() {
  const app = express();

  // Core middleware
  app.use(helmet());
  const corsOptions = {
    origin: true, // reflect request origin, effectively allowing all
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false
  };
  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));

  // Request logging in development
  if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
  }

  // Basic rate limiting
  app.use(createRateLimiter());

  // Audit logging (safe metadata only)
  app.use(auditMiddleware);

  // Versioned API routing
  app.use('/api/v1', apiRouter);

  // 404 and error handling
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp();


