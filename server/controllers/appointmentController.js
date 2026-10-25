const mongoose = require('mongoose')
const Appointment = require('../models/Appointment')
const Hospital = require('../models/Hospital')
const Doctor = require('../models/Doctor')
const { listHospitals, listDoctors, getAvailability } = require('../services/appointmentService')

const httpErr = (status, message) => Object.assign(new Error(message), { status })
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)) && new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value
const validTime = value => /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
const appointmentTime = (date, time) => new Date(`${date}T${time}:00.000Z`)

async function requireDoctorSlot(doctor, date, time) {
  const schedule = doctor.availability.find(day => day.date === date)
  if (!schedule || !schedule.times.includes(time) || appointmentTime(date, time) <= new Date()) {
    throw httpErr(409, 'That date or time is not available. Please choose another slot.')
  }
}

function handleSlotConflict(error) {
  if (error.code === 11000) throw httpErr(409, 'That appointment slot was just booked. Please choose another slot.')
  throw error
}

exports.hospitals = async (req, res) => res.json({ hospitals: await listHospitals(String(req.query.search || '').trim().slice(0, 100)) })

exports.doctors = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.hospitalId)) throw httpErr(404, 'Hospital not found')
  const hospital = await Hospital.findById(req.params.hospitalId)
  if (!hospital) throw httpErr(404, 'Hospital not found')
  res.json({ doctors: await listDoctors(hospital._id, String(req.query.specialty || '').trim().slice(0, 80)) })
}

exports.availability = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.doctorId)) throw httpErr(404, 'Doctor not found')
  const doctor = await Doctor.findById(req.params.doctorId)
  if (!doctor) throw httpErr(404, 'Doctor not found')
  if (req.query.date && !validDate(String(req.query.date))) throw httpErr(400, 'Invalid date')
  res.json(await getAvailability(doctor, req.query.date ? String(req.query.date) : ''))
}

exports.list = async (req, res) => {
  await Appointment.updateMany({ patient: req.user._id, status: 'upcoming', appointmentAt: { $lte: new Date() } }, { $set: { status: 'completed' } })
  const appointments = await Appointment.find({ patient: req.user._id })
    .populate('hospital', 'name address location isDemo')
    .populate('doctor', 'name specialty qualifications experienceYears')
    .sort({ appointmentAt: -1 })
  res.json({ appointments })
}

exports.create = async (req, res) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) throw httpErr(400, 'Invalid appointment details')
  const { hospitalId, doctorId, reason, symptoms = '', appointmentType, date, time } = req.body
  if (!mongoose.isValidObjectId(hospitalId) || !mongoose.isValidObjectId(doctorId)) throw httpErr(400, 'Select a valid hospital and doctor')
  if (typeof reason !== 'string' || reason.trim().length < 3 || reason.trim().length > 500) throw httpErr(400, 'Enter a consultation reason between 3 and 500 characters')
  if (typeof symptoms !== 'string' || symptoms.length > 2000) throw httpErr(400, 'Additional details must be 2,000 characters or fewer')
  if (!['in-person', 'online'].includes(appointmentType)) throw httpErr(400, 'Select a valid appointment type')
  if (typeof date !== 'string' || !validDate(date) || typeof time !== 'string' || !validTime(time)) throw httpErr(400, 'Select a valid date and time')
  const [hospital, doctor] = await Promise.all([Hospital.findById(hospitalId), Doctor.findById(doctorId)])
  if (!hospital || !doctor || !doctor.hospital.equals(hospital._id)) throw httpErr(400, 'The selected doctor is not associated with this hospital')
  if (appointmentType === 'online' && !doctor.supportsOnline) throw httpErr(400, 'Online appointments are not available with this doctor')
  await requireDoctorSlot(doctor, date, time)
  try {
    const appointment = await Appointment.create({
      patient: req.user._id, hospital: hospital._id, doctor: doctor._id,
      reason: reason.trim(), symptoms: symptoms.trim(), appointmentType, date, time,
      appointmentAt: appointmentTime(date, time), fee: doctor.fee, status: 'upcoming', isDemo: true,
    })
    await appointment.populate([
      { path: 'hospital', select: 'name address location isDemo' },
      { path: 'doctor', select: 'name specialty qualifications experienceYears' },
    ])
    res.status(201).json({ message: 'Demo appointment saved successfully', appointment })
  } catch (error) { handleSlotConflict(error) }
}

exports.cancel = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw httpErr(404, 'Appointment not found')
  const appointment = await Appointment.findOneAndUpdate(
    { _id: req.params.id, patient: req.user._id, status: 'upcoming', appointmentAt: { $gt: new Date() } },
    { $set: { status: 'cancelled' } },
    { new: true },
  )
  if (!appointment) throw httpErr(404, 'Upcoming appointment not found or can no longer be cancelled')
  res.json({ message: 'Appointment cancelled', appointment })
}

exports.reschedule = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw httpErr(404, 'Appointment not found')
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) throw httpErr(400, 'Invalid date or time')
  const { date, time } = req.body
  if (typeof date !== 'string' || !validDate(date) || typeof time !== 'string' || !validTime(time)) throw httpErr(400, 'Select a valid date and time')
  const appointment = await Appointment.findOne({ _id: req.params.id, patient: req.user._id, status: 'upcoming', appointmentAt: { $gt: new Date() } })
  if (!appointment) throw httpErr(404, 'Upcoming appointment not found or can no longer be rescheduled')
  const doctor = await Doctor.findById(appointment.doctor)
  if (!doctor) throw httpErr(404, 'Doctor not found')
  await requireDoctorSlot(doctor, date, time)
  try {
    const updated = await Appointment.findOneAndUpdate(
      { _id: appointment._id, patient: req.user._id, status: 'upcoming', appointmentAt: { $gt: new Date() } },
      { $set: { date, time, appointmentAt: appointmentTime(date, time) } },
      { new: true, runValidators: true },
    ).populate('hospital', 'name address location isDemo').populate('doctor', 'name specialty qualifications experienceYears')
    if (!updated) throw httpErr(409, 'This appointment changed before it could be rescheduled. Refresh and try again.')
    res.json({ message: 'Appointment rescheduled', appointment: updated })
  } catch (error) { handleSlotConflict(error) }
}
