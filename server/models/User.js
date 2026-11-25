const mongoose = require('mongoose')
const emergencyContactSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  relationship: { type: String, trim: true, maxlength: 60, default: '' },
  phone: { type: String, required: true, trim: true, maxlength: 20 },
}, { _id: false })
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  password: { type: String, required: true, select: false },
  dateOfBirth: { type: Date, default: null },
  gender: { type: String, trim: true, maxlength: 40, default: '' },
  address: { type: String, trim: true, maxlength: 500, default: '' },
  bloodGroup: { type: String, enum: ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], default: '' },
  allergies: { type: [{ type: String, trim: true, maxlength: 120 }], default: [] },
  medicalConditions: { type: [{ type: String, trim: true, maxlength: 120 }], default: [] },
  currentMedications: { type: [{ type: String, trim: true, maxlength: 120 }], default: [] },
  emergencyContacts: { type: [emergencyContactSchema], default: [] },
  medicalNotes: { type: String, trim: true, maxlength: 5000, default: '' },
  emergencyQrTokenHash: { type: String, default: null, select: false },
  emergencyQrTokenEncrypted: { type: String, default: null, select: false },
  emergencyQrTokenIv: { type: String, default: null, select: false },
  emergencyQrTokenTag: { type: String, default: null, select: false },
  emergencyQrExpiresAt: { type: Date, default: null },
}, { timestamps: true })
userSchema.index({ emergencyQrTokenHash: 1 }, {
  unique: true,
  partialFilterExpression: { emergencyQrTokenHash: { $type: 'string' } },
})
userSchema.set('toJSON', {
  transform: (_doc, record) => {
    delete record.password
    delete record.emergencyQrTokenHash
    delete record.emergencyQrTokenEncrypted
    delete record.emergencyQrTokenIv
    delete record.emergencyQrTokenTag
    delete record.__v
    return record
  },
})
module.exports = mongoose.model('User', userSchema)
