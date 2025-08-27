const mongoose = require('mongoose');

const DepartmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    description: { type: String, default: '' },
    createdBy: { type: String, required: true }, // uid of creator
    adminUids: { type: [String], default: [], index: true }
  },
  { timestamps: true }
);

// Unique index defined via field-level unique: true

module.exports = mongoose.model('Department', DepartmentSchema);


