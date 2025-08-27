const { StatusCodes } = require('http-status-codes');
const { isRoleAtLeast } = require('../utils/roles');

function requireRole(requiredRole) {
  return function (req, res, next) {
    const role = req.user && req.user.role;
    if (!role || role !== requiredRole) {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        error: { message: 'Forbidden', reason: 'Insufficient role permissions' }
      });
    }
    next();
  };
}

function requireRoleAtLeast(minimumRole) {
  return function (req, res, next) {
    const role = req.user && req.user.role;
    if (!role || !isRoleAtLeast(role, minimumRole)) {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        error: { message: 'Forbidden', reason: 'Insufficient role permissions' }
      });
    }
    next();
  };
}

module.exports = { requireRole, requireRoleAtLeast };


