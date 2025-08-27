// Simple in-memory rate limiter. For production, use a distributed store.
const { StatusCodes } = require('http-status-codes');

function createRateLimiter(options = {}) {
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || options.windowMs || 15 * 60 * 1000);
  const max = Number(process.env.RATE_LIMIT_MAX_REQUESTS || options.max || 100);

  const hits = new Map();

  return function rateLimiter(req, res, next) {
    // Allow CORS preflight to pass unthrottled
    if (req.method === 'OPTIONS') {
      return next();
    }
    const now = Date.now();
    const key = req.ip;
    const entry = hits.get(key) || { count: 0, start: now };

    if (now - entry.start > windowMs) {
      entry.count = 0;
      entry.start = now;
    }
    entry.count += 1;
    hits.set(key, entry);

    if (entry.count > max) {
      return res.status(StatusCodes.TOO_MANY_REQUESTS).json({
        success: false,
        error: {
          message: 'Rate Limit Exceeded',
          reason: `Too many requests. Try again after ${Math.ceil((entry.start + windowMs - now) / 1000)}s.`
        }
      });
    }

    next();
  };
}

module.exports = { createRateLimiter };


