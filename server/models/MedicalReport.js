const mongoose = require('mongoose')
const CATEGORIES = ['General', 'Blood Test', 'Imaging', 'Prescription', 'Cardiology', 'Other']
const schema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  category: { type: String, enum: CATEGORIES, default: 'General' },
  originalName: { type: String, required: true },
  storedName: { type: String, required: true, unique: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
}, { timestamps: true })
// storedName is internal; never send it to clients.
schema.set('toJSON', { transform: (_d, r) => { delete r.storedName; delete r.__v; return r } })
module.exports = mongoose.model('MedicalReport', schema)
module.exports.CATEGORIES = CATEGORIES
