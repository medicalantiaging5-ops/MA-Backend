const { StatusCodes } = require('http-status-codes');
const Patient = require('../models/Patient');
const { initFirebaseAdmin } = require('../utils/firebase');

async function createOrGetPatient(req, res) {
  const admin = initFirebaseAdmin();
  const me = await admin.auth().getUser(req.user.uid);
  const { firstName, lastName, bio, emergencyContact } = req.body;
  const upsert = await Patient.findOneAndUpdate(
    { uid: req.user.uid },
    {
      uid: req.user.uid,
      email: me.email,
      firstName: firstName || (me.displayName ? me.displayName.split(' ')[0] : ''),
      lastName: lastName || (me.displayName ? me.displayName.split(' ').slice(1).join(' ') : ''),
      ...(bio ? { bio } : {}),
      ...(emergencyContact ? { emergencyContact } : {})
    },
    { upsert: true, new: true }
  ).lean();
  return res.status(StatusCodes.CREATED).json({ success: true, data: upsert });
}

async function getPatient(req, res) {
  const doc = await Patient.findOne({ uid: req.user.uid }).lean();
  if (!doc) {
    return res.status(StatusCodes.NOT_FOUND).json({ success: false, error: { message: 'Not Found', reason: 'Patient not found' } });
  }
  return res.json({ success: true, data: doc });
}

async function updatePatient(req, res) {
  const { firstName, lastName, bio, emergencyContact } = req.body;
  const updated = await Patient.findOneAndUpdate(
    { uid: req.user.uid },
    { $set: { ...(firstName ? { firstName } : {}), ...(lastName ? { lastName } : {}), ...(bio ? { bio } : {}), ...(emergencyContact ? { emergencyContact } : {}) } },
    { new: true }
  ).lean();
  if (!updated) {
    return res.status(StatusCodes.NOT_FOUND).json({ success: false, error: { message: 'Not Found', reason: 'Patient not found' } });
  }
  return res.json({ success: true, data: updated });
}

module.exports = { createOrGetPatient, getPatient, updatePatient };


