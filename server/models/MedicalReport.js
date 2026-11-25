const mongoose = require('mongoose')
const CATEGORIES = ['General', 'Blood Test', 'Imaging', 'Prescription', 'Cardiology', 'Other']
const testResultSchema = new mongoose.Schema({
  testName: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
  value: { type: Number, required: true },
  unit: { type: String, required: true, trim: true, minlength: 1, maxlength: 40 },
  testDate: { type: Date, required: true },
}, { timestamps: true })
const parameterSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 160 },
  value: { type: String, required: true, trim: true, maxlength: 500 },
  unit: { type: String, trim: true, maxlength: 100, default: '' },
  referenceRange: { type: String, trim: true, maxlength: 160, default: '' },
  status: { type: String, enum: ['outside_range', 'within_range', 'range_not_provided', 'unclear'], default: 'unclear' },
  explanation: { type: String, trim: true, maxlength: 1000, default: '' },
  evidence: { type: String, trim: true, maxlength: 1000, default: '' },
}, { _id: false })
const termSchema = new mongoose.Schema({
  term: { type: String, required: true, trim: true, maxlength: 160 },
  explanation: { type: String, required: true, trim: true, maxlength: 1000 },
}, { _id: false })
const diagnosisSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true, maxlength: 1000 },
  evidence: { type: String, required: true, trim: true, maxlength: 1000 },
}, { _id: false })
const aiSummarySchema = new mongoose.Schema({
  overview: { type: String, required: true, maxlength: 1000 },
  parameters: { type: [parameterSchema], default: [] },
  terminology: { type: [termSchema], default: [] },
  observationsToDiscuss: { type: [String], default: [] },
  missingOrUnclear: { type: [String], default: [] },
  explicitDiagnoses: { type: [diagnosisSchema], default: [] },
  disclaimer: { type: String, required: true, maxlength: 300 },
  generatedAt: { type: Date, required: true },
  model: { type: String, required: true, maxlength: 100 },
}, { _id: false })
const schema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  category: { type: String, enum: CATEGORIES, default: 'General' },
  originalName: { type: String, required: true },
  storedName: { type: String, required: true, unique: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  testResults: { type: [testResultSchema], default: [] },
  aiSummary: { type: aiSummarySchema, default: null },
}, { timestamps: true })
// storedName is internal; never send it to clients.
schema.set('toJSON', { transform: (_d, r) => { delete r.storedName; delete r.__v; return r } })
module.exports = mongoose.model('MedicalReport', schema)
module.exports.CATEGORIES = CATEGORIES
