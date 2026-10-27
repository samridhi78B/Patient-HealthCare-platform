const mongoose = require('mongoose')

const CATEGORIES = ['general', 'pain', 'respiratory', 'digestive', 'neurological', 'skin', 'emotional', 'other']
const symptomEntrySchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  symptom: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  category: { type: String, enum: CATEGORIES, required: true, default: 'general' },
  severity: { type: Number, required: true, min: 1, max: 10, validate: Number.isInteger },
  occurredAt: { type: Date, required: true },
  durationValue: { type: Number, min: 0, max: 100000, default: null },
  durationUnit: { type: String, enum: ['', 'minutes', 'hours', 'days'], default: '' },
  bodyLocation: { type: String, trim: true, maxlength: 100, default: '' },
  notes: { type: String, trim: true, maxlength: 2000, default: '' },
  triggers: { type: String, trim: true, maxlength: 1000, default: '' },
  dailyImpact: { type: String, trim: true, maxlength: 1000, default: '' },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null },
}, { timestamps: true })

symptomEntrySchema.index({ owner: 1, occurredAt: -1 })
symptomEntrySchema.index({ owner: 1, category: 1, occurredAt: -1 })

symptomEntrySchema.set('toJSON', {
  transform: (_doc, value) => {
    delete value.__v
    return value
  },
})

module.exports = mongoose.model('SymptomEntry', symptomEntrySchema)
module.exports.CATEGORIES = CATEGORIES
