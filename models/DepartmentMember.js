const mongoose = require('mongoose');

const DepartmentMemberSchema = new mongoose.Schema(
  {
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    uid: { type: String, required: true, index: true },
    role: { type: String, enum: ['admin', 'staff'], default: 'staff', index: true },
    createdBy: { type: String, required: true }
  },
  { timestamps: true }
);

DepartmentMemberSchema.index({ departmentId: 1, uid: 1 }, { unique: true });

module.exports = mongoose.model('DepartmentMember', DepartmentMemberSchema);


