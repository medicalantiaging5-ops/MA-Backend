const app = require('../app');
const { connectToDatabase } = require('../utils/db');

// Vercel serverless entrypoint
module.exports = async (req, res) => {
  // Ensure DB connection is initialized per cold start
  try {
    await connectToDatabase(process.env.MONGODB_URI);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('DB connection failed', err && err.message ? err.message : err);
  }
  return app(req, res);
};


