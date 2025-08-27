const mongoose = require('mongoose');

const PatientSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, index: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    bio: {
      age: { type: Number, default: null },
      sex: { type: String, enum: ['male', 'female', 'other', null], default: null },
      nationality: { type: String, default: '' },
      occupation: { type: String, default: '' },
      maritalStatus: { type: String, default: '' },
      phone: { type: String, default: '' },
      address: { type: String, default: '' }
    },
    emergencyContact: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Patient', PatientSchema);


