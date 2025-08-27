function getFounderEmail() {
  return process.env.FOUNDER_EMAIL || 'medicalantiaging5@gmail.com';
}

module.exports = { getFounderEmail };


