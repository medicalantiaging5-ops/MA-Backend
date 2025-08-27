const { StatusCodes } = require('http-status-codes');
const { initFirebaseAdmin } = require('../utils/firebase');

function verifyFirebaseIdToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      error: { message: 'Unauthorized', reason: 'Missing or invalid Authorization header' }
    });
  }

  try {
    const admin = initFirebaseAdmin();
    admin
      .auth()
      .verifyIdToken(token)
      .then((decoded) => {
        req.user = {
          uid: decoded.uid,
          email: decoded.email || null,
          role: decoded.role || 'patient'
        };
        next();
      })
      .catch((err) => {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          error: { message: 'Unauthorized', reason: err.message || 'Invalid token' }
        });
      });
  } catch (err) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: { message: 'Auth Initialization Failed', reason: err.stack || String(err) }
    });
  }
}

module.exports = { verifyFirebaseIdToken };


