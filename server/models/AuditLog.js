const mongoose = require('mongoose')

const schema = new mongoose.Schema({
  clinicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinician', default: null, index: true },
  clinicianLicenseNumber: { type: String, trim: true, maxlength: 60, default: '' },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  action: {
    type: String,
    enum: ['EMERGENCY_READ', 'QR_ISSUE', 'QR_REVOKE', 'SUMMARY_VIEW', 'HISTORY_VERIFY', 'MEDICAL_RECORD_CREATE', 'ACCESS_SESSION_CLOSE', 'PATIENT_RECORD_READ', 'REPORT_REVIEW', 'REPORT_READ', 'DOCTOR_NOTE_CREATE', 'APPOINTMENT_UPDATE'],
    required: true,
  },
  actorType: { type: String, enum: ['clinician', 'patient'], required: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, required: true },
  reason: { type: String, trim: true, maxlength: 500, default: '' },
  timestamp: { type: Date, default: Date.now, index: true },
  ip: { type: String, maxlength: 100, default: '' },
  userAgent: { type: String, maxlength: 500, default: '' },
}, { versionKey: false })

schema.index({ clinicianId: 1, timestamp: -1 })
module.exports = mongoose.model('AuditLog', schema)
