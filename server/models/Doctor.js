const mongoose = require('mongoose')

const doctorSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  specialty: { type: String, required: true },
  qualifications: { type: String, required: true },
  experienceYears: { type: Number, required: true, min: 0 },
  fee: { type: Number, required: true, min: 0 },
  supportsOnline: { type: Boolean, default: true },
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
  availability: [{
    date: { type: String, required: true },
    times: [{ type: String, required: true }],
  }],
  isDemo: { type: Boolean, default: true },
}, { timestamps: true })

module.exports = mongoose.model('Doctor', doctorSchema)
