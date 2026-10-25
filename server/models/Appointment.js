const mongoose = require('mongoose')

const appointmentSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  reason: { type: String, required: true, trim: true, minlength: 3, maxlength: 500 },
  symptoms: { type: String, trim: true, maxlength: 2000, default: '' },
  appointmentType: { type: String, enum: ['in-person', 'online'], required: true },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  time: { type: String, required: true, match: /^\d{2}:\d{2}$/ },
  appointmentAt: { type: Date, required: true },
  fee: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['upcoming', 'completed', 'cancelled'], default: 'upcoming', required: true },
  isDemo: { type: Boolean, default: true },
}, { timestamps: true })

appointmentSchema.index(
  { doctor: 1, date: 1, time: 1 },
  { unique: true, partialFilterExpression: { status: 'upcoming' } },
)

module.exports = mongoose.model('Appointment', appointmentSchema)
