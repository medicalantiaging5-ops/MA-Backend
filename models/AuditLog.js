const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema(
  {
    uid: { type: String, index: true, default: null },
    role: { type: String, default: null },
    method: { type: String, required: true },
    path: { type: String, required: true, index: true },
    statusCode: { type: Number, required: true, index: true },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    responseTimeMs: { type: Number, required: true }
  },
  { timestamps: true }
);

AuditLogSchema.index({ createdAt: 1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);


