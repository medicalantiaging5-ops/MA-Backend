const AuditLog = require('../models/AuditLog');

async function auditMiddleware(req, res, next) {
  const start = Date.now();
  res.on('finish', async () => {
    try {
      const duration = Date.now() - start;
      const uid = (req.user && req.user.uid) || null;
      const role = (req.user && req.user.role) || null;
      const method = req.method;
      const path = req.originalUrl.split('?')[0];
      const statusCode = res.statusCode;
      const ip = req.ip;
      const userAgent = req.headers['user-agent'] || null;

      await AuditLog.create({ uid, role, method, path, statusCode, ip, userAgent, responseTimeMs: duration });
    } catch (_) {
      // Intentionally ignore audit errors to avoid impacting request flow
    }
  });
  next();
}

module.exports = { auditMiddleware };


