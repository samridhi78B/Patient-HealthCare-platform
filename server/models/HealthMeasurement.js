const mongoose = require('mongoose')

const healthMeasurementSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  measuredAt: { type: Date, required: true },
  heightCm: { type: Number, required: true, min: 80, max: 250 },
  weightKg: { type: Number, required: true, min: 20, max: 350 },
  waistCm: { type: Number, min: 20, max: 250, default: null },
}, { timestamps: true })

healthMeasurementSchema.index({ owner: 1, measuredAt: -1 })
healthMeasurementSchema.index({ owner: 1, measuredAt: 1 }, { unique: true })

module.exports = mongoose.model('HealthMeasurement', healthMeasurementSchema)
