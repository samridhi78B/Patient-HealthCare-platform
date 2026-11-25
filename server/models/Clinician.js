const mongoose = require('mongoose')

const clinicianSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  password: { type: String, required: true, select: false },
  licenseNumber: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 60 },
  specialization: { type: String, required: true, trim: true, maxlength: 120 },
  hospital: { type: String, required: true, trim: true, maxlength: 160 },
  role: { type: String, enum: ['clinician'], default: 'clinician', immutable: true },
  isVerified: { type: Boolean, default: false },
}, { timestamps: true })

clinicianSchema.set('toJSON', {
  transform: (_doc, record) => {
    delete record.password
    delete record.__v
    return record
  },
})

module.exports = mongoose.model('Clinician', clinicianSchema)
