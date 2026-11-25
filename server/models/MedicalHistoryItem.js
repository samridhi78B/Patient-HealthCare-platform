const mongoose = require('mongoose')

const schema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  report: { type: mongoose.Schema.Types.ObjectId, ref: 'MedicalReport', default: null, index: true },
  sourceKey: { type: String, trim: true, maxlength: 64 },
  sourceReportTitle: { type: String, trim: true, maxlength: 160, default: '' },
  type: {
    type: String,
    enum: ['parameter', 'reported-diagnosis', 'diagnosis', 'prescription', 'consultation', 'surgery', 'procedure', 'observation', 'note'],
    required: true,
  },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  value: { type: String, trim: true, maxlength: 500, default: '' },
  unit: { type: String, trim: true, maxlength: 40, default: '' },
  referenceRange: { type: String, trim: true, maxlength: 120, default: '' },
  details: { type: String, trim: true, maxlength: 2000, default: '' },
  evidence: { type: String, trim: true, maxlength: 1000, default: '' },
  observedAt: { type: Date, default: null },
  source: { type: String, enum: ['patient-entered', 'report-extracted', 'clinician-entered'], required: true },
  verificationStatus: { type: String, enum: ['unreviewed', 'patient-reviewed', 'clinician-verified'], default: 'unreviewed' },
  createdByClinician: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinician', default: null },
  verifiedByClinician: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinician', default: null },
  verifiedAt: { type: Date, default: null },
}, { timestamps: true })

schema.index({ owner: 1, sourceKey: 1 }, {
  unique: true,
  partialFilterExpression: { sourceKey: { $type: 'string' } },
})
schema.index({ owner: 1, observedAt: -1 })

module.exports = mongoose.model('MedicalHistoryItem', schema)
