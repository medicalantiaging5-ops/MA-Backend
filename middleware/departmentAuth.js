const { StatusCodes } = require('http-status-codes');
const Department = require('../models/Department');
const { ROLES } = require('../utils/roles');

async function requireDepartmentAdminOrHigher(req, res, next) {
  try {
    const { id } = req.params;
    const dept = await Department.findById(id).lean();
    if (!dept) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, error: { message: 'Not Found', reason: 'Department not found' } });
    }
    const isGlobal = req.user && (req.user.role === ROLES.FOUNDER || req.user.role === ROLES.COFOUNDER);
    const isDeptAdmin = dept.adminUids && Array.isArray(dept.adminUids) && dept.adminUids.includes(req.user.uid);
    if (!isGlobal && !isDeptAdmin) {
      return res.status(StatusCodes.FORBIDDEN).json({ success: false, error: { message: 'Forbidden', reason: 'Admin privileges required for department' } });
    }
    req.department = dept;
    next();
  } catch (err) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, error: { message: 'Authorization Error', reason: err.stack || String(err) } });
  }
}

module.exports = { requireDepartmentAdminOrHigher };


