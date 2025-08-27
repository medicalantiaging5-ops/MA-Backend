const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { StatusCodes } = require('http-status-codes');
const { verifyFirebaseIdToken } = require('../middleware/auth');
const { requireRoleAtLeast } = require('../middleware/roles');
const { ROLES } = require('../utils/roles');
const ctrl = require('../controllers/allowlistController');

const router = express.Router();

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(StatusCodes.BAD_REQUEST).json({ success: false, error: { message: 'Validation Error', reason: JSON.stringify(errors.array()) } });
  }
  next();
}

router.get('/', verifyFirebaseIdToken, requireRoleAtLeast(ROLES.FOUNDER), ctrl.listAllowlist);

router.post('/', verifyFirebaseIdToken, requireRoleAtLeast(ROLES.FOUNDER), [body('email').isEmail()], handleValidation, ctrl.addAllowedEmail);

router.delete('/:id', verifyFirebaseIdToken, requireRoleAtLeast(ROLES.FOUNDER), [param('id').isMongoId()], handleValidation, ctrl.removeAllowedEmail);

module.exports = router;


