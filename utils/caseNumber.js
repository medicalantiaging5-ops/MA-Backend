const Counter = require('../models/Counter');

async function nextCaseNumberForDepartment(departmentId) {
  const key = `dept:${departmentId}:case`;
  const updated = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  ).lean();
  const seq = updated.seq;
  const year = new Date().getFullYear();
  // Format: DPT-<YEAR>-<SEQ_PADDED>
  const num = String(seq).padStart(5, '0');
  return `DPT-${year}-${num}`;
}

module.exports = { nextCaseNumberForDepartment };


