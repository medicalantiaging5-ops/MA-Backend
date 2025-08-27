const crypto = require('crypto');

function generateToken(bytes = 32) {
  const token = crypto.randomBytes(bytes).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hash };
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = { generateToken, hashToken };


