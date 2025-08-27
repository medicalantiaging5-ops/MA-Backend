const ROLES = {
  FOUNDER: 'founder',
  COFOUNDER: 'cofounder',
  DEPT_ADMIN: 'dept_admin',
  STAFF: 'staff',
  PATIENT: 'patient'
};

const ROLE_LEVEL = {
  [ROLES.PATIENT]: 1,
  [ROLES.STAFF]: 2,
  [ROLES.DEPT_ADMIN]: 3,
  [ROLES.COFOUNDER]: 4,
  [ROLES.FOUNDER]: 5
};

function isRoleAtLeast(role, minimum) {
  const r = ROLE_LEVEL[role] || 0;
  const m = ROLE_LEVEL[minimum] || 0;
  return r >= m;
}

module.exports = { ROLES, ROLE_LEVEL, isRoleAtLeast };


