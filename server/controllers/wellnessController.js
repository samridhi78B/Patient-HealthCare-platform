const mongoose = require('mongoose')
const WellnessLog = require('../models/WellnessLog')

const httpErr = (status, message) => Object.assign(new Error(message), { status })
const FIELDS = ['date', 'sleepHours', 'waterLitres', 'activityMinutes', 'mealsRegular']
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const validDate = value => DATE_PATTERN.test(value)
  && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))
  && new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value

const dateKey = value => new Date(value).toISOString().slice(0, 10)

function dateFilter(from, to) {
  if (!from && !to) return {}
  if (typeof from !== 'string' || typeof to !== 'string' || !validDate(from) || !validDate(to)) {
    throw httpErr(400, 'Provide valid from and to dates in YYYY-MM-DD format')
  }
  if (from > to) throw httpErr(400, 'The start date must be on or before the end date')
  const days = (Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / 864e5
  if (days > 1825) throw httpErr(400, 'Date range cannot exceed five years')
  return {
    date: {
      $gte: new Date(`${from}T00:00:00.000Z`),
      $lte: new Date(`${to}T00:00:00.000Z`),
    },
  }
}

function requireBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw httpErr(400, 'Invalid daily wellness log')
  const unknown = Object.keys(body).filter(key => !FIELDS.includes(key))
  if (unknown.length) throw httpErr(400, `Unsupported wellness log field: ${unknown[0]}`)
}

function validatedValues(body, existing) {
  requireBody(body)
  const date = body.date === undefined ? existing && dateKey(existing.date) : body.date
  const sleepHours = body.sleepHours === undefined ? existing && existing.sleepHours : body.sleepHours
  const waterLitres = body.waterLitres === undefined ? existing && existing.waterLitres : body.waterLitres
  const activityMinutes = body.activityMinutes === undefined ? existing && existing.activityMinutes : body.activityMinutes
  const mealsRegular = body.mealsRegular === undefined ? existing && existing.mealsRegular : body.mealsRegular

  const latestAllowedDate = new Date()
  latestAllowedDate.setUTCDate(latestAllowedDate.getUTCDate() + 1)
  if (typeof date !== 'string' || !validDate(date) || date > latestAllowedDate.toISOString().slice(0, 10)) {
    throw httpErr(400, 'Enter a valid log date')
  }
  if (typeof sleepHours !== 'number' || !Number.isFinite(sleepHours) || sleepHours < 0 || sleepHours > 24) {
    throw httpErr(400, 'Sleep duration must be between 0 and 24 hours')
  }
  if (typeof waterLitres !== 'number' || !Number.isFinite(waterLitres) || waterLitres < 0 || waterLitres > 20) {
    throw httpErr(400, 'Water intake must be between 0 and 20 litres')
  }
  if (typeof activityMinutes !== 'number' || !Number.isInteger(activityMinutes) || activityMinutes < 0 || activityMinutes > 1440) {
    throw httpErr(400, 'Activity duration must be a whole number from 0 to 1,440 minutes')
  }
  if (typeof mealsRegular !== 'boolean') throw httpErr(400, 'Select whether meals were regular or irregular')

  return {
    date: new Date(`${date}T00:00:00.000Z`),
    sleepHours,
    waterLitres,
    activityMinutes,
    mealsRegular,
  }
}

exports.list = async (req, res) => {
  const logs = await WellnessLog.find({
    owner: req.user._id,
    ...dateFilter(req.query.from, req.query.to),
  }).sort({ date: -1, _id: -1 })
  res.json({ logs })
}

exports.create = async (req, res) => {
  const values = validatedValues(req.body)
  const existing = await WellnessLog.findOne({ owner: req.user._id, date: values.date }).select('_id')
  if (existing) throw httpErr(409, 'A daily log already exists for this date. Edit that log instead.')
  let log
  try {
    log = await WellnessLog.create({ owner: req.user._id, ...values })
  } catch (error) {
    if (error.code === 11000) throw httpErr(409, 'A daily log already exists for this date. Edit that log instead.')
    throw error
  }
  res.status(201).json({ message: 'Daily wellness log saved', log })
}

exports.update = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw httpErr(404, 'Wellness log not found')
  const log = await WellnessLog.findOne({ _id: req.params.id, owner: req.user._id })
  if (!log) throw httpErr(404, 'Wellness log not found')
  const values = validatedValues(req.body, log)
  if (values.date.getTime() !== new Date(log.date).getTime()) {
    const duplicate = await WellnessLog.findOne({ owner: req.user._id, date: values.date, _id: { $ne: log._id } }).select('_id')
    if (duplicate) throw httpErr(409, 'A daily log already exists for this date. Edit that log instead.')
  }
  Object.assign(log, values)
  try {
    await log.save()
  } catch (error) {
    if (error.code === 11000) throw httpErr(409, 'A daily log already exists for this date. Edit that log instead.')
    throw error
  }
  res.json({ message: 'Daily wellness log updated', log })
}
