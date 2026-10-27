const mongoose = require('mongoose')
const HealthMeasurement = require('../models/HealthMeasurement')

const httpErr = (status, message) => Object.assign(new Error(message), { status })
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))
  && new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value
  && value <= new Date().toISOString().slice(0, 10)

function validate(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw httpErr(400, 'Enter valid measurement details')
  const allowed = ['measuredAt', 'heightCm', 'weightKg', 'waistCm']
  const unknown = Object.keys(body).filter(key => !allowed.includes(key))
  if (unknown.length) throw httpErr(400, `Unsupported measurement field: ${unknown[0]}`)
  if (typeof body.measuredAt !== 'string' || !validDate(body.measuredAt)) throw httpErr(400, 'Choose a valid measurement date that is not in the future')
  for (const [field, min, max] of [['heightCm', 80, 250], ['weightKg', 20, 350]]) {
    if (typeof body[field] !== 'number' || !Number.isFinite(body[field]) || body[field] < min || body[field] > max) {
      throw httpErr(400, `${field === 'heightCm' ? 'Height' : 'Weight'} must be between ${min} and ${max}`)
    }
  }
  const waistCm = body.waistCm === null || body.waistCm === '' || body.waistCm === undefined ? null : body.waistCm
  if (waistCm !== null && (typeof waistCm !== 'number' || !Number.isFinite(waistCm) || waistCm < 20 || waistCm > 250)) {
    throw httpErr(400, 'Waist circumference must be between 20 and 250 cm')
  }
  return {
    measuredAt: new Date(`${body.measuredAt}T00:00:00.000Z`),
    heightCm: body.heightCm,
    weightKg: body.weightKg,
    waistCm,
  }
}

exports.list = async (req, res) => {
  const measurements = await HealthMeasurement.find({ owner: req.user._id }).sort({ measuredAt: 1, _id: 1 })
  res.json({ measurements })
}

exports.create = async (req, res) => {
  const values = validate(req.body)
  const duplicate = await HealthMeasurement.findOne({ owner: req.user._id, measuredAt: values.measuredAt }).select('_id')
  if (duplicate) throw httpErr(409, 'A measurement already exists for this date. Edit that entry instead.')
  const measurement = await HealthMeasurement.create({ owner: req.user._id, ...values })
  res.status(201).json({ message: 'Measurement saved', measurement })
}

exports.update = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw httpErr(404, 'Measurement not found')
  const values = validate(req.body)
  const duplicate = await HealthMeasurement.findOne({
    owner: req.user._id,
    measuredAt: values.measuredAt,
    _id: { $ne: req.params.id },
  }).select('_id')
  if (duplicate) throw httpErr(409, 'A measurement already exists for this date.')
  const measurement = await HealthMeasurement.findOneAndUpdate(
    { _id: req.params.id, owner: req.user._id },
    { $set: values },
    { new: true, runValidators: true },
  )
  if (!measurement) throw httpErr(404, 'Measurement not found')
  res.json({ message: 'Measurement updated', measurement })
}

exports.remove = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw httpErr(404, 'Measurement not found')
  const measurement = await HealthMeasurement.findOneAndDelete({ _id: req.params.id, owner: req.user._id })
  if (!measurement) throw httpErr(404, 'Measurement not found')
  res.json({ message: 'Measurement deleted' })
}
