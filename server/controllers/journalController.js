const mongoose = require('mongoose')
const Appointment = require('../models/Appointment')
const SymptomEntry = require('../models/SymptomEntry')

const httpErr = (status, message) => Object.assign(new Error(message), { status })
const FIELDS = ['symptom', 'category', 'severity', 'occurredAt', 'durationValue', 'durationUnit', 'bodyLocation', 'notes', 'triggers', 'dailyImpact', 'appointmentId']
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const validDate = value => DATE_PATTERN.test(value)
  && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))
  && new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value
const dateRange = (from, to, required = false) => {
  if (!from && !to && !required) return {}
  if (typeof from !== 'string' || typeof to !== 'string' || !validDate(from) || !validDate(to)) throw httpErr(400, 'Provide valid from and to dates in YYYY-MM-DD format')
  if (from > to) throw httpErr(400, 'The start date must be on or before the end date')
  const days = (Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / 864e5
  if (days > 1825) throw httpErr(400, 'Date range cannot exceed five years')
  return { occurredAt: { $gte: new Date(`${from}T00:00:00.000Z`), $lt: new Date(Date.parse(`${to}T00:00:00.000Z`) + 864e5) } }
}
const appointmentFields = 'date time appointmentAt status reason'
const populateAppointment = query => query.populate({
  path: 'appointment',
  select: appointmentFields,
  populate: [
    { path: 'doctor', select: 'name specialty' },
    { path: 'hospital', select: 'name location' },
  ],
})

function requireBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw httpErr(400, 'Invalid symptom entry')
  const unknown = Object.keys(body).filter(key => !FIELDS.includes(key))
  if (unknown.length) throw httpErr(400, `Unsupported symptom entry field: ${unknown[0]}`)
}

async function validatedValues(body, owner, existing = {}) {
  requireBody(body)
  const symptom = body.symptom === undefined ? existing.symptom : body.symptom
  const category = body.category === undefined ? existing.category : body.category
  const severity = body.severity === undefined ? existing.severity : body.severity
  const occurredAt = body.occurredAt === undefined ? existing.occurredAt : body.occurredAt
  const durationValue = body.durationValue === undefined ? existing.durationValue : body.durationValue
  const durationUnit = body.durationUnit === undefined ? existing.durationUnit || '' : body.durationUnit
  const bodyLocation = body.bodyLocation === undefined ? existing.bodyLocation || '' : body.bodyLocation
  const notes = body.notes === undefined ? existing.notes || '' : body.notes
  const triggers = body.triggers === undefined ? existing.triggers || '' : body.triggers
  const dailyImpact = body.dailyImpact === undefined ? existing.dailyImpact || '' : body.dailyImpact
  const appointmentId = body.appointmentId === undefined
    ? existing.appointment?._id || existing.appointment || null
    : body.appointmentId || null
  const categories = SymptomEntry.CATEGORIES

  if (typeof symptom !== 'string' || symptom.trim().length < 2 || symptom.trim().length > 100) throw httpErr(400, 'Symptom name must be between 2 and 100 characters')
  if (!categories.includes(category)) throw httpErr(400, 'Select a valid symptom category')
  if (!Number.isInteger(severity) || severity < 1 || severity > 10) throw httpErr(400, 'Severity must be a whole number from 1 to 10')
  if (typeof occurredAt !== 'string' && !(occurredAt instanceof Date)) throw httpErr(400, 'Enter a valid date and time for the symptom')
  const parsedAt = new Date(occurredAt)
  if (Number.isNaN(parsedAt.getTime()) || parsedAt > new Date()) throw httpErr(400, 'Enter a valid symptom date and time that is not in the future')
  const durationProvided = durationValue !== '' && durationValue !== null && durationValue !== undefined
  const parsedDuration = durationProvided ? Number(durationValue) : null
  if (durationProvided && !['number', 'string'].includes(typeof durationValue)) throw httpErr(400, 'Duration must be a number from 0 to 100,000')
  if (durationProvided && (!Number.isFinite(parsedDuration) || parsedDuration < 0 || parsedDuration > 100000)) throw httpErr(400, 'Duration must be a number from 0 to 100,000')
  if (!['', 'minutes', 'hours', 'days'].includes(durationUnit) || (durationProvided && !durationUnit) || (!durationProvided && durationUnit)) {
    throw httpErr(400, 'Select a duration unit when entering a duration')
  }
  for (const [field, value, maxLength] of [['body location', bodyLocation, 100], ['notes', notes, 2000], ['triggers', triggers, 1000], ['daily impact', dailyImpact, 1000]]) {
    if (typeof value !== 'string' || value.length > maxLength) throw httpErr(400, `${field} must be ${maxLength} characters or fewer`)
  }

  let appointment = null
  if (appointmentId) {
    if (typeof appointmentId !== 'string' && !(appointmentId instanceof mongoose.Types.ObjectId)) throw httpErr(400, 'Select a valid appointment')
    if (!mongoose.isValidObjectId(appointmentId)) throw httpErr(400, 'Select a valid appointment')
    appointment = await Appointment.findOne({ _id: appointmentId, patient: owner }).select('_id')
    if (!appointment) throw httpErr(400, 'The selected appointment does not belong to your account')
  }

  return {
    symptom: symptom.trim(),
    category,
    severity,
    occurredAt: parsedAt,
    durationValue: parsedDuration,
    durationUnit,
    bodyLocation: bodyLocation.trim(),
    notes: notes.trim(),
    triggers: triggers.trim(),
    dailyImpact: dailyImpact.trim(),
    appointment: appointment?._id || null,
  }
}

function buildFilters(query, owner) {
  const filters = { owner, ...dateRange(query.from, query.to) }
  if (query.category) {
    if (!SymptomEntry.CATEGORIES.includes(query.category)) throw httpErr(400, 'Select a valid symptom category')
    filters.category = query.category
  }
  if (query.severity !== undefined && query.severity !== '') {
    const severity = Number(query.severity)
    if (!Number.isInteger(severity) || severity < 1 || severity > 10) throw httpErr(400, 'Severity filter must be a whole number from 1 to 10')
    filters.severity = severity
  }
  if (query.symptom) {
    if (typeof query.symptom !== 'string' || query.symptom.length > 100) throw httpErr(400, 'Symptom filter must be 100 characters or fewer')
    filters.symptom = new RegExp(`^${query.symptom.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
  }
  return filters
}

exports.list = async (req, res) => {
  const filters = buildFilters(req.query, req.user._id)
  const entries = await populateAppointment(SymptomEntry.find(filters).sort({ occurredAt: -1, _id: -1 }))
  res.json({ entries })
}

exports.create = async (req, res) => {
  const values = await validatedValues(req.body, req.user._id)
  const entry = await SymptomEntry.create({ owner: req.user._id, ...values })
  await entry.populate({ path: 'appointment', select: appointmentFields, populate: [{ path: 'doctor', select: 'name specialty' }, { path: 'hospital', select: 'name location' }] })
  res.status(201).json({ message: 'Symptom entry saved', entry })
}

exports.update = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw httpErr(404, 'Symptom entry not found')
  const entry = await SymptomEntry.findOne({ _id: req.params.id, owner: req.user._id })
  if (!entry) throw httpErr(404, 'Symptom entry not found')
  const values = await validatedValues(req.body, req.user._id, entry)
  Object.assign(entry, values)
  await entry.save()
  await entry.populate({ path: 'appointment', select: appointmentFields, populate: [{ path: 'doctor', select: 'name specialty' }, { path: 'hospital', select: 'name location' }] })
  res.json({ message: 'Symptom entry updated', entry })
}

exports.remove = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw httpErr(404, 'Symptom entry not found')
  const entry = await SymptomEntry.findOneAndDelete({ _id: req.params.id, owner: req.user._id })
  if (!entry) throw httpErr(404, 'Symptom entry not found')
  res.json({ message: 'Symptom entry deleted' })
}

exports.trends = async (req, res) => {
  const filters = buildFilters(req.query, req.user._id)
  const groupBy = req.query.groupBy || 'week'
  if (!['day', 'week', 'month'].includes(groupBy)) throw httpErr(400, 'Trend grouping must be day, week, or month')
  const trendFilters = { owner: req.user._id, ...dateRange(req.query.from, req.query.to) }
  if (filters.category) trendFilters.category = filters.category
  if (filters.severity) trendFilters.severity = filters.severity
  const allEntries = await SymptomEntry.find(trendFilters).select('symptom category severity occurredAt').sort({ occurredAt: 1 }).lean()
  const selected = filters.symptom
    ? allEntries.filter(entry => filters.symptom.test(entry.symptom))
    : allEntries
  const frequency = new Map()
  for (const entry of allEntries) {
    const key = entry.symptom
    const current = frequency.get(key) || { symptom: key, count: 0, totalSeverity: 0 }
    current.count += 1
    current.totalSeverity += entry.severity
    frequency.set(key, current)
  }
  const bucketMap = new Map()
  for (const entry of selected) {
    const date = new Date(entry.occurredAt)
    let key
    let label
    if (groupBy === 'day') {
      key = date.toISOString().slice(0, 10)
      label = key
    } else if (groupBy === 'week') {
      const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
      const day = (start.getUTCDay() + 6) % 7
      start.setUTCDate(start.getUTCDate() - day)
      key = start.toISOString().slice(0, 10)
      label = key
    } else {
      key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
      label = key
    }
    const bucket = bucketMap.get(key) || { period: label, count: 0, totalSeverity: 0 }
    bucket.count += 1
    bucket.totalSeverity += entry.severity
    bucketMap.set(key, bucket)
  }
  const averageSeverity = selected.length
    ? selected.reduce((sum, entry) => sum + entry.severity, 0) / selected.length
    : null
  res.json({
    groupBy,
    count: selected.length,
    averageSeverity,
    frequentSymptoms: [...frequency.values()]
      .map(item => ({ symptom: item.symptom, count: item.count, averageSeverity: item.totalSeverity / item.count }))
      .sort((a, b) => b.count - a.count || a.symptom.localeCompare(b.symptom))
      .slice(0, 5),
    points: [...bucketMap.values()].map(bucket => ({
      period: bucket.period,
      count: bucket.count,
      averageSeverity: bucket.totalSeverity / bucket.count,
    })),
  })
}

exports.exportHistory = async (req, res) => {
  const range = dateRange(req.query.from, req.query.to, true)
  const [entries, user] = await Promise.all([
    populateAppointment(SymptomEntry.find({ owner: req.user._id, ...range }).sort({ occurredAt: 1, _id: 1 })),
    mongoose.model('User').findById(req.user._id).select('name'),
  ])
  const summary = entries.reduce((result, entry) => {
    result.count += 1
    result.totalSeverity += entry.severity
    const item = result.frequency.get(entry.symptom) || { symptom: entry.symptom, count: 0, totalSeverity: 0 }
    item.count += 1
    item.totalSeverity += entry.severity
    result.frequency.set(entry.symptom, item)
    return result
  }, { count: 0, totalSeverity: 0, frequency: new Map() })
  const exportEntries = entries.map(entry => {
    const value = entry.toObject()
    delete value.owner
    return value
  })
  res.setHeader('Cache-Control', 'private, no-store')
  res.json({
    patient: { name: user?.name || '' },
    from: req.query.from,
    to: req.query.to,
    entries: exportEntries,
    summary: {
      count: summary.count,
      averageSeverity: summary.count ? summary.totalSeverity / summary.count : null,
      frequentSymptoms: [...summary.frequency.values()]
        .map(item => ({ symptom: item.symptom, count: item.count, averageSeverity: item.totalSeverity / item.count }))
        .sort((a, b) => b.count - a.count || a.symptom.localeCompare(b.symptom)),
    },
    disclaimer: 'This is a patient-recorded history and is not a medical diagnosis. Consult a healthcare professional for interpretation.',
  })
}

exports.appointments = async (req, res) => {
  const appointments = await Appointment.find({ patient: req.user._id })
    .select('date time appointmentAt status reason')
    .populate('doctor', 'name specialty')
    .populate('hospital', 'name location')
    .sort({ appointmentAt: -1 })
  res.json({ appointments })
}
