const mongoose = require('mongoose')

const wellnessLogSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  sleepHours: { type: Number, required: true, min: 0, max: 24 },
  waterLitres: { type: Number, required: true, min: 0, max: 20 },
  activityMinutes: { type: Number, required: true, min: 0, max: 1440, validate: Number.isInteger },
  mealsRegular: { type: Boolean, required: true },
}, { timestamps: true })

wellnessLogSchema.index({ owner: 1, date: -1 }, { unique: true })

wellnessLogSchema.set('toJSON', {
  transform: (_doc, value) => {
    delete value.__v
    return value
  },
})

module.exports = mongoose.model('WellnessLog', wellnessLogSchema)
