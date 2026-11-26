const mongoose = require('mongoose')

const clinicianSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  password: { type: String, required: true, select: false },
  licenseNumber: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 60 },
  specialization: { type: String, required: true, trim: true, maxlength: 120 },
  hospital: { type: String, required: true, trim: true, maxlength: 160 },
  phone: { type: String, trim: true, maxlength: 20, default: '' },
  experienceYears: { type: Number, min: 0, max: 80, default: 0 },
  about: { type: String, trim: true, maxlength: 2000, default: '' },
  avatarUrl: { type: String, trim: true, maxlength: 2000, default: '' },
  providerDoctorIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' }],
  role: { type: String, enum: ['clinician'], default: 'clinician', immutable: true },
}, { timestamps: true })

clinicianSchema.set('toJSON', {
  transform: (_doc, record) => {
    delete record.password
    delete record.__v
    return record
  },
})

module.exports = mongoose.model('Clinician', clinicianSchema)
