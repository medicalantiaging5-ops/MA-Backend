const { StatusCodes } = require('http-status-codes');
const Department = require('../models/Department');
const { nextCaseNumberForDepartment } = require('../utils/caseNumber');

async function listDepartments(req, res) {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Department.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Department.countDocuments({})
  ]);

  return res.json({ success: true, data: { items, page, limit, total } });
}

async function createDepartment(req, res) {
  const { name, description } = req.body;
  const doc = await Department.create({ name, description: description || '', createdBy: req.user.uid });
  return res.status(StatusCodes.CREATED).json({ success: true, data: { id: doc._id, name: doc.name, description: doc.description } });
}

async function getDepartment(req, res) {
  const { id } = req.params;
  const doc = await Department.findById(id).lean();
  if (!doc) {
    return res.status(StatusCodes.NOT_FOUND).json({ success: false, error: { message: 'Not Found', reason: 'Department not found' } });
  }
  return res.json({ success: true, data: doc });
}

async function updateDepartment(req, res) {
  const { id } = req.params;
  const { name, description } = req.body;
  const updated = await Department.findByIdAndUpdate(
    id,
    { $set: { ...(name ? { name } : {}), ...(description !== undefined ? { description } : {}) } },
    { new: true }
  ).lean();
  if (!updated) {
    return res.status(StatusCodes.NOT_FOUND).json({ success: false, error: { message: 'Not Found', reason: 'Department not found' } });
  }
  return res.json({ success: true, data: updated });
}

async function deleteDepartment(req, res) {
  const { id } = req.params;
  const removed = await Department.findByIdAndDelete(id).lean();
  if (!removed) {
    return res.status(StatusCodes.NOT_FOUND).json({ success: false, error: { message: 'Not Found', reason: 'Department not found' } });
  }
  return res.json({ success: true, data: { id } });
}

module.exports = { listDepartments, createDepartment, getDepartment, updateDepartment, deleteDepartment };

async function generateCaseNumber(req, res) {
  const { id } = req.params;
  const caseNumber = await nextCaseNumberForDepartment(id);
  return res.json({ success: true, data: { caseNumber } });
}

module.exports.generateCaseNumber = generateCaseNumber;


