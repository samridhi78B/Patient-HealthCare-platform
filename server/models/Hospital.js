const mongoose = require('mongoose')

const hospitalSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true },
  location: { type: String, required: true },
  address: { type: String, required: true },
  specialties: [{ type: String, required: true }],
  isDemo: { type: Boolean, default: true },
}, { timestamps: true })

module.exports = mongoose.model('Hospital', hospitalSchema)
