const mongoose = require('mongoose')

const schema = new mongoose.Schema({
  tokenHash: { type: String, required: true, unique: true, select: false },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  clinicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinician', required: true, index: true },
  reason: { type: String, required: true, trim: true, maxlength: 500 },
  readOnly: { type: Boolean, default: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  revokedAt: { type: Date, default: null },
}, { timestamps: true })

module.exports = mongoose.model('EmergencyAccessSession', schema)
