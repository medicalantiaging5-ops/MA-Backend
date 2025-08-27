const express = require('express');
const { body, validationResult } = require('express-validator');
const { StatusCodes } = require('http-status-codes');
const { verifyFirebaseIdToken } = require('../middleware/auth');
const ctrl = require('../controllers/patientController');

const router = express.Router();

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(StatusCodes.BAD_REQUEST).json({ success: false, error: { message: 'Validation Error', reason: JSON.stringify(errors.array()) } });
  }
  next();
}

router.post(
  '/',
  verifyFirebaseIdToken,
  [
    body('firstName').optional().isString().trim(),
    body('lastName').optional().isString().trim(),
    body('bio').optional().isObject(),
    body('emergencyContact').optional().isObject()
  ],
  handleValidation,
  ctrl.createOrGetPatient
);

router.get('/me', verifyFirebaseIdToken, ctrl.getPatient);

router.patch(
  '/me',
  verifyFirebaseIdToken,
  [
    body('firstName').optional().isString().trim(),
    body('lastName').optional().isString().trim(),
    body('bio').optional().isObject(),
    body('emergencyContact').optional().isObject()
  ],
  handleValidation,
  ctrl.updatePatient
);

module.exports = router;


