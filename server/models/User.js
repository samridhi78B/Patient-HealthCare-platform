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
}, { timestamps: true })
module.exports = mongoose.model('User', userSchema)
