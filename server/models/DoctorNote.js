const mongoose = require('mongoose')

const schema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  clinicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinician', required: true, index: true },
  note: { type: String, required: true, trim: true, maxlength: 5000 },
  prescription: { type: String, trim: true, maxlength: 5000, default: '' },
}, { timestamps: true })

schema.index({ patientId: 1, createdAt: -1 })
module.exports = mongoose.model('DoctorNote', schema)
