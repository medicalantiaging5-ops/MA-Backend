const mongoose = require('mongoose');
const { ROLES } = require('../utils/roles');

const UserSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, index: true, unique: true },
    email: { type: String, required: true, index: true, unique: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    emailVerified: { type: Boolean, default: false },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.PATIENT,
      index: true
    }
  },
  { timestamps: true }
);

// Field-level indexes above are sufficient; avoid duplicate schema.index definitions

module.exports = mongoose.model('User', UserSchema);


