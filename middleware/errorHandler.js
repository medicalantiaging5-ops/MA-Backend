const { StatusCodes } = require('http-status-codes');

function notFound(req, res, next) {
  res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    error: { message: 'Not Found', reason: `Route ${req.originalUrl} not found` }
  });
}

function errorHandler(err, req, res, next) {
  const status = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  const message = err.message || 'Internal Server Error';
  const reason = err.stack || String(err);
  res.status(status).json({ success: false, error: { message, reason } });
}

module.exports = { notFound, errorHandler };


