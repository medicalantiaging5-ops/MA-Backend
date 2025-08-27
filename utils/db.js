const mongoose = require('mongoose');

async function connectToDatabase(mongoUri) {
  if (!mongoUri) {
    const error = new Error('Missing MONGODB_URI');
    throw error;
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true
    });
    return mongoose.connection;
  } catch (err) {
    throw err;
  }
}

module.exports = { connectToDatabase };


