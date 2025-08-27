const mongoose = require('mongoose');
const { ROLES } = require('../utils/roles');

const InviteSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, index: true },
    role: { type: String, enum: Object.values(ROLES), required: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    createdBy: { type: String, required: true } // uid of inviter
  },
  { timestamps: true }
);

InviteSchema.index({ email: 1, expiresAt: 1 });

module.exports = mongoose.model('Invite', InviteSchema);


