const { StatusCodes } = require('http-status-codes');
const DepartmentMember = require('../models/DepartmentMember');
const Department = require('../models/Department');

async function listMembers(req, res) {
  const { id } = req.params;
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    DepartmentMember.find({ departmentId: id }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    DepartmentMember.countDocuments({ departmentId: id })
  ]);
  return res.json({ success: true, data: { items, page, limit, total } });
}

async function addMember(req, res) {
  const { id } = req.params;
  const { uid, memberRole } = req.body;
  const dept = await Department.findById(id);
  if (!dept) {
    return res.status(StatusCodes.NOT_FOUND).json({ success: false, error: { message: 'Not Found', reason: 'Department not found' } });
  }
  const doc = await DepartmentMember.create({ departmentId: id, uid, role: memberRole, createdBy: req.user.uid });
  if (memberRole === 'admin' && !dept.adminUids.includes(uid)) {
    dept.adminUids.push(uid);
    await dept.save();
  }
  return res.status(StatusCodes.CREATED).json({ success: true, data: doc });
}

async function updateMember(req, res) {
  const { id, uid } = req.params;
  const { memberRole } = req.body;
  const updated = await DepartmentMember.findOneAndUpdate({ departmentId: id, uid }, { $set: { role: memberRole } }, { new: true }).lean();
  if (!updated) {
    return res.status(StatusCodes.NOT_FOUND).json({ success: false, error: { message: 'Not Found', reason: 'Member not found' } });
  }
  // reflect admin list on department document
  const dept = await Department.findById(id);
  if (dept) {
    const idx = dept.adminUids.indexOf(uid);
    if (memberRole === 'admin' && idx === -1) dept.adminUids.push(uid);
    if (memberRole === 'staff' && idx !== -1) dept.adminUids.splice(idx, 1);
    await dept.save();
  }
  return res.json({ success: true, data: updated });
}

async function removeMember(req, res) {
  const { id, uid } = req.params;
  const removed = await DepartmentMember.findOneAndDelete({ departmentId: id, uid }).lean();
  if (!removed) {
    return res.status(StatusCodes.NOT_FOUND).json({ success: false, error: { message: 'Not Found', reason: 'Member not found' } });
  }
  const dept = await Department.findById(id);
  if (dept) {
    const idx = dept.adminUids.indexOf(uid);
    if (idx !== -1) {
      dept.adminUids.splice(idx, 1);
      await dept.save();
    }
  }
  return res.json({ success: true, data: { uid } });
}

module.exports = { listMembers, addMember, updateMember, removeMember };


