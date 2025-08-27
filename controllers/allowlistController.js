const { StatusCodes } = require('http-status-codes');
const AllowedEmail = require('../models/AllowedEmail');

async function listAllowlist(req, res) {
  const items = await AllowedEmail.find({}).sort({ createdAt: -1 }).lean();
  return res.json({ success: true, data: { items } });
}

async function addAllowedEmail(req, res) {
  const { email } = req.body;
  try {
    const doc = await AllowedEmail.create({ email: email.toLowerCase(), createdBy: req.user.uid });
    return res.status(StatusCodes.CREATED).json({ success: true, data: { id: doc._id, email: doc.email } });
  } catch (err) {
    return res.status(StatusCodes.BAD_REQUEST).json({ success: false, error: { message: 'Allowlist Add Failed', reason: err.stack || String(err) } });
  }
}

async function removeAllowedEmail(req, res) {
  const { id } = req.params;
  const removed = await AllowedEmail.findByIdAndDelete(id).lean();
  if (!removed) {
    return res.status(StatusCodes.NOT_FOUND).json({ success: false, error: { message: 'Not Found', reason: 'Allowlist entry not found' } });
  }
  return res.json({ success: true, data: { id } });
}

module.exports = { listAllowlist, addAllowedEmail, removeAllowedEmail };


