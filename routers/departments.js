const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { StatusCodes } = require('http-status-codes');
const { verifyFirebaseIdToken } = require('../middleware/auth');
const { requireRoleAtLeast } = require('../middleware/roles');
const { ROLES } = require('../utils/roles');
const ctrl = require('../controllers/departmentController');
const memberCtrl = require('../controllers/departmentMemberController');
const { requireDepartmentAdminOrHigher } = require('../middleware/departmentAuth');

const router = express.Router();

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(StatusCodes.BAD_REQUEST).json({ success: false, error: { message: 'Validation Error', reason: JSON.stringify(errors.array()) } });
  }
  next();
}

router.get(
  '/',
  verifyFirebaseIdToken,
  [query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 100 })],
  handleValidation,
  ctrl.listDepartments
);

router.post(
  '/',
  verifyFirebaseIdToken,
  requireRoleAtLeast(ROLES.COFOUNDER),
  [body('name').isString().trim().isLength({ min: 1 }), body('description').optional().isString().trim()],
  handleValidation,
  ctrl.createDepartment
);

router.get('/:id', verifyFirebaseIdToken, [param('id').isMongoId()], handleValidation, ctrl.getDepartment);

router.patch(
  '/:id',
  verifyFirebaseIdToken,
  requireRoleAtLeast(ROLES.COFOUNDER),
  [param('id').isMongoId(), body('name').optional().isString().trim(), body('description').optional().isString().trim()],
  handleValidation,
  ctrl.updateDepartment
);

router.delete('/:id', verifyFirebaseIdToken, requireRoleAtLeast(ROLES.FOUNDER), [param('id').isMongoId()], handleValidation, ctrl.deleteDepartment);

// Case number
router.post('/:id/case-number', verifyFirebaseIdToken, requireDepartmentAdminOrHigher, [param('id').isMongoId()], handleValidation, ctrl.generateCaseNumber);

// Members
router.get('/:id/members', verifyFirebaseIdToken, [param('id').isMongoId(), query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 100 })], handleValidation, memberCtrl.listMembers);

router.post(
  '//:id/members',
  verifyFirebaseIdToken,
  requireDepartmentAdminOrHigher,
  [param('id').isMongoId(), body('uid').isString().trim().isLength({ min: 1 }), body('memberRole').isIn(['admin', 'staff'])],
  handleValidation,
  memberCtrl.addMember
);

router.patch(
  '/:id/members/:uid',
  verifyFirebaseIdToken,
  requireDepartmentAdminOrHigher,
  [param('id').isMongoId(), param('uid').isString().trim().isLength({ min: 1 }), body('memberRole').isIn(['admin', 'staff'])],
  handleValidation,
  memberCtrl.updateMember
);

router.delete(
  '/:id/members/:uid',
  verifyFirebaseIdToken,
  requireDepartmentAdminOrHigher,
  [param('id').isMongoId(), param('uid').isString().trim().isLength({ min: 1 })],
  handleValidation,
  memberCtrl.removeMember
);

module.exports = router;


