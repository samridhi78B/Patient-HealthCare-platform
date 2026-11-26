const fs = require('fs')
const path = require('path')
const mongoose = require('mongoose')
const Appointment = require('../models/Appointment')
const AuditLog = require('../models/AuditLog')
const Clinician = require('../models/Clinician')
const Doctor = require('../models/Doctor')
const DoctorNote = require('../models/DoctorNote')
const HealthMeasurement = require('../models/HealthMeasurement')
const MedicalHistoryItem = require('../models/MedicalHistoryItem')
const MedicalReport = require('../models/MedicalReport')
const SymptomEntry = require('../models/SymptomEntry')
const User = require('../models/User')
const WellnessLog = require('../models/WellnessLog')
const { STORAGE_DIR } = require('../middleware/upload')

const httpErr = (status, message) => Object.assign(new Error(message), { status })
const isObjectId = value => mongoose.isValidObjectId(value)
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const ageOf = date => {
  if (!date) return null
  const birth = new Date(date)
  const today = new Date()
  if (Number.isNaN(birth.getTime()) || birth > today) return null
  return today.getFullYear() - birth.getFullYear() - (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate()) ? 1 : 0)
}

async function doctorIdsFor(clinician) {
  if (clinician.providerDoctorIds?.length) return clinician.providerDoctorIds
  const name = new RegExp(`^${escapeRegex(clinician.name.trim())}$`, 'i')
  const specialty = new RegExp(`^${escapeRegex(clinician.specialization.trim())}$`, 'i')
  const candidates = await Doctor.find({ name, specialty }).populate('hospital', 'name')
  const matches = candidates.filter(doctor => doctor.hospital?.name?.trim().toLowerCase() === clinician.hospital.trim().toLowerCase())
  if (!matches.length) return []
  clinician.providerDoctorIds = matches.map(doctor => doctor._id)
  await clinician.save()
  return clinician.providerDoctorIds
}

async function appointmentsFor(clinician, filter = {}) {
  const doctorIds = await doctorIdsFor(clinician)
  if (!doctorIds.length) return []
  await Appointment.updateMany(
    { doctor: { $in: doctorIds }, status: 'upcoming', appointmentAt: { $lte: new Date() } },
    { $set: { status: 'completed' } },
  )
  return Appointment.find({ doctor: { $in: doctorIds }, ...filter })
    .populate('patient', 'name phone dateOfBirth gender')
    .populate('doctor', 'name specialty')
    .populate('hospital', 'name')
    .sort({ appointmentAt: 1 })
}

async function patientIdsFor(clinician) {
  const doctorIds = await doctorIdsFor(clinician)
  return doctorIds.length ? Appointment.distinct('patient', { doctor: { $in: doctorIds } }) : []
}

async function assertPatientAccess(clinician, patientId) {
  if (!isObjectId(patientId)) throw httpErr(404, 'Patient not found')
  const doctorIds = await doctorIdsFor(clinician)
  if (!doctorIds.length || !await Appointment.exists({ doctor: { $in: doctorIds }, patient: patientId })) {
    throw httpErr(404, 'Patient not found')
  }
}

async function audit(req, patientId, action, reason = '') {
  await AuditLog.create({
    clinicianId: req.user.clinicianId,
    clinicianLicenseNumber: req.user.licenseNumber,
    patientId,
    actorType: 'clinician',
    actorId: req.user.clinicianId,
    action,
    reason,
    ip: req.ip,
    userAgent: req.get('user-agent') || '',
  })
}

function reviewFor(report, clinicianId) {
  return report.doctorReviews?.find(review => String(review.clinicianId) === String(clinicianId))
}

function patientSummary(patient, lastVisit) {
  return {
    _id: patient._id,
    name: patient.name,
    phone: patient.phone,
    age: ageOf(patient.dateOfBirth),
    gender: patient.gender,
    bloodGroup: patient.bloodGroup,
    lastVisit: lastVisit || null,
  }
}

exports.dashboard = async (req, res) => {
  const clinician = await Clinician.findById(req.user.clinicianId)
  const appointments = await appointmentsFor(clinician)
  const today = new Date()
  const todayStart = new Date(today)
  todayStart.setHours(0, 0, 0, 0)
  const tomorrow = new Date(todayStart)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const todayAppointments = appointments.filter(item => item.appointmentAt >= todayStart && item.appointmentAt < tomorrow)
  const patientsById = new Map()
  const recentById = new Map()
  for (const appointment of appointments) {
    const patient = appointment.patient
    if (patient) {
      const id = String(patient._id)
      if (!patientsById.has(id)) patientsById.set(id, patient)
      if (appointment.status === 'completed' && appointment.appointmentAt <= today) {
        const current = recentById.get(id)
        if (!current || appointment.appointmentAt > current.lastVisit) {
          recentById.set(id, patientSummary(patient, appointment.appointmentAt))
        }
      }
    }
  }
  const patientIds = [...patientsById.keys()]
  const [reports, emergencyScans] = await Promise.all([
    patientIds.length ? MedicalReport.find({ owner: { $in: patientIds } }).select('doctorReviews') : [],
    AuditLog.countDocuments({ clinicianId: req.user.clinicianId, action: { $in: ['SUMMARY_VIEW', 'EMERGENCY_READ'] }, timestamp: { $gte: todayStart, $lt: tomorrow } }),
  ])
  const pendingReports = reports.filter(report => reviewFor(report, req.user.clinicianId)?.status !== 'reviewed').length
  const recentPatients = [...recentById.values()].sort((a, b) => new Date(b.lastVisit) - new Date(a.lastVisit)).slice(0, 5)
  res.json({
    stats: { todaysAppointments: todayAppointments.length, totalPatients: patientsById.size, pendingReports, emergencyQrScans: emergencyScans },
    appointments: todayAppointments,
    recentPatients,
  })
}

exports.listPatients = async (req, res) => {
  const clinician = await Clinician.findById(req.user.clinicianId)
  const patientIds = await patientIdsFor(clinician)
  const doctorIds = await doctorIdsFor(clinician)
  await Appointment.updateMany(
    { doctor: { $in: doctorIds }, status: 'upcoming', appointmentAt: { $lte: new Date() } },
    { $set: { status: 'completed' } },
  )
  const search = String(req.query.search || '').trim().slice(0, 100)
  const conditions = { _id: { $in: patientIds } }
  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i')
    conditions.$or = [{ name: regex }, { phone: regex }]
    if (isObjectId(search)) conditions.$or.push({ _id: search })
  }
  const patients = await User.find(conditions).select('name phone dateOfBirth gender bloodGroup').sort({ name: 1 }).limit(200)
  const latestAppointments = patients.length
    ? await Appointment.find({ doctor: { $in: doctorIds }, patient: { $in: patients.map(item => item._id) }, status: 'completed' }).sort({ appointmentAt: -1 }).select('patient appointmentAt').lean()
    : []
  const latestByPatient = new Map()
  for (const appointment of latestAppointments) {
    if (!latestByPatient.has(String(appointment.patient))) latestByPatient.set(String(appointment.patient), appointment.appointmentAt)
  }
  res.json({ patients: patients.map(patient => patientSummary(patient, latestByPatient.get(String(patient._id)))) })
}

exports.patientProfile = async (req, res) => {
  const clinician = await Clinician.findById(req.user.clinicianId)
  await assertPatientAccess(clinician, req.params.patientId)
  const patient = await User.findById(req.params.patientId).select(
    'name email phone dateOfBirth gender address bloodGroup allergies medicalConditions currentMedications medicalNotes emergencyContacts emergencyQrTokenHash emergencyQrExpiresAt',
  )
  if (!patient) throw httpErr(404, 'Patient not found')
  const doctorIds = await doctorIdsFor(clinician)
  const [appointments, reports, history, measurements, journal, wellness, notes] = await Promise.all([
    Appointment.find({ patient: patient._id, doctor: { $in: doctorIds } }).populate('doctor', 'name specialty').populate('hospital', 'name').sort({ appointmentAt: -1 }).limit(50),
    MedicalReport.find({ owner: patient._id }).select('title category originalName mimeType size createdAt doctorReviews').sort({ createdAt: -1 }),
    MedicalHistoryItem.find({ owner: patient._id }).select('-owner -sourceKey').populate('report', 'title originalName category createdAt').sort({ observedAt: -1, createdAt: -1 }).limit(100),
    HealthMeasurement.find({ owner: patient._id }).sort({ measuredAt: 1 }).limit(100),
    SymptomEntry.find({ owner: patient._id }).select('-owner').sort({ occurredAt: -1 }).limit(100),
    WellnessLog.find({ owner: patient._id }).sort({ date: 1 }).limit(100),
    DoctorNote.find({ patientId: patient._id }).populate('clinicianId', 'name specialization').sort({ createdAt: -1 }).limit(100),
  ])
  await audit(req, patient._id, 'PATIENT_RECORD_READ')
  const reportList = reports.map(report => {
    const review = reviewFor(report, req.user.clinicianId)
    const details = report.toJSON()
    delete details.doctorReviews
    return { ...details, review: review || null, status: review?.status || 'pending' }
  })
  const timeline = [
    ...history.map(item => ({ _id: item._id, type: 'history', title: item.title, details: item.details || item.value, date: item.observedAt || item.createdAt })),
    ...journal.map(item => ({ _id: item._id, type: 'journal', title: item.symptom, details: item.notes, date: item.occurredAt })),
    ...appointments.map(item => ({ _id: item._id, type: 'appointment', title: `Appointment · ${item.status}`, details: item.reason, date: item.appointmentAt })),
    ...reports.map(item => ({ _id: item._id, type: 'report', title: item.title, details: item.category, date: item.createdAt })),
  ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
  res.json({
    patient: {
      ...patient.toJSON(),
      age: ageOf(patient.dateOfBirth),
      emergencyQr: { active: Boolean(patient.emergencyQrTokenHash && patient.emergencyQrExpiresAt > new Date()), expiresAt: patient.emergencyQrExpiresAt },
    },
    appointments, reports: reportList, history, measurements, journal, wellness, timeline, notes,
  })
}

exports.addNote = async (req, res) => {
  const clinician = await Clinician.findById(req.user.clinicianId)
  await assertPatientAccess(clinician, req.params.patientId)
  const { note, prescription = '' } = req.body || {}
  if (typeof note !== 'string' || !note.trim() || note.trim().length > 5000) throw httpErr(400, 'Enter a note of 1 to 5,000 characters')
  if (typeof prescription !== 'string' || prescription.length > 5000) throw httpErr(400, 'Prescription must be 5,000 characters or fewer')
  const saved = await DoctorNote.create({ patientId: req.params.patientId, clinicianId: clinician._id, note: note.trim(), prescription: prescription.trim() })
  await saved.populate('clinicianId', 'name specialization')
  await audit(req, req.params.patientId, 'DOCTOR_NOTE_CREATE')
  res.status(201).json({ note: saved })
}

exports.listAppointments = async (req, res) => {
  const clinician = await Clinician.findById(req.user.clinicianId)
  const status = String(req.query.status || '').toLowerCase()
  if (status && !['upcoming', 'completed', 'cancelled'].includes(status)) throw httpErr(400, 'Select a valid appointment status')
  res.json({ appointments: await appointmentsFor(clinician, status ? { status } : {}) })
}

exports.updateAppointment = async (req, res) => {
  if (!isObjectId(req.params.id)) throw httpErr(404, 'Appointment not found')
  const clinician = await Clinician.findById(req.user.clinicianId)
  const doctorIds = await doctorIdsFor(clinician)
  const appointment = await Appointment.findOne({ _id: req.params.id, doctor: { $in: doctorIds } })
    .populate('patient', 'name phone')
    .populate('doctor', 'name specialty')
    .populate('hospital', 'name')
  if (!appointment) throw httpErr(404, 'Appointment not found')
  const { action } = req.body || {}
  if (appointment.status === 'upcoming' && appointment.appointmentAt <= new Date()) {
    throw httpErr(409, 'Past appointments can no longer be updated')
  }
  if (action === 'accept') {
    if (appointment.status !== 'upcoming') throw httpErr(409, 'Only upcoming appointments can be accepted')
    appointment.acceptedAt = appointment.acceptedAt || new Date()
  } else if (action === 'cancel') {
    if (appointment.status !== 'upcoming') throw httpErr(409, 'Only upcoming appointments can be cancelled')
    appointment.status = 'cancelled'
  } else if (action === 'complete') {
    if (appointment.status !== 'upcoming') throw httpErr(409, 'Only upcoming appointments can be completed')
    appointment.status = 'completed'
  } else throw httpErr(400, 'Select a valid appointment action')
  await appointment.save()
  await audit(req, appointment.patient._id, 'APPOINTMENT_UPDATE', `Appointment ${action}`)
  res.json({ appointment })
}

exports.rescheduleAppointment = async (req, res) => {
  if (!isObjectId(req.params.id)) throw httpErr(404, 'Appointment not found')
  const { date, time } = req.body || {}
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw httpErr(400, 'Select a valid date and time')
  }
  const at = new Date(`${date}T${time}:00.000Z`)
  if (Number.isNaN(at.getTime()) || at <= new Date() || at.toISOString().slice(0, 10) !== date) throw httpErr(400, 'Appointment must be rescheduled to a future date and time')
  const clinician = await Clinician.findById(req.user.clinicianId)
  const doctorIds = await doctorIdsFor(clinician)
  const appointment = await Appointment.findOne({ _id: req.params.id, doctor: { $in: doctorIds }, status: 'upcoming' })
    .populate('patient', 'name phone')
    .populate('doctor', 'name specialty')
    .populate('hospital', 'name')
  if (!appointment) throw httpErr(404, 'Upcoming appointment not found')
  const doctor = await Doctor.findById(appointment.doctor._id || appointment.doctor).select('availability')
  const day = doctor?.availability.find(item => item.date === date)
  if (!day?.times.includes(time)) throw httpErr(409, 'That date or time is not in this doctor’s available schedule')
  try {
    appointment.date = date
    appointment.time = time
    appointment.appointmentAt = at
    appointment.acceptedAt = null
    await appointment.save()
  } catch (error) {
    if (error.code === 11000) throw httpErr(409, 'That appointment slot is already booked')
    throw error
  }
  await audit(req, appointment.patient._id, 'APPOINTMENT_UPDATE', 'Appointment rescheduled')
  res.json({ appointment })
}

exports.listReports = async (req, res) => {
  const clinician = await Clinician.findById(req.user.clinicianId)
  const patientIds = await patientIdsFor(clinician)
  if (!patientIds.length) return res.json({ reports: [] })
  const search = String(req.query.search || '').trim().slice(0, 100)
  const query = { owner: { $in: patientIds } }
  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i')
    const matchingPatients = await User.find({ _id: { $in: patientIds }, name: regex }).select('_id').lean()
    query.$or = [{ title: regex }, { category: regex }, { owner: { $in: matchingPatients.map(patient => patient._id) } }]
  }
  const reports = await MedicalReport.find(query).populate('owner', 'name').select('title category originalName mimeType size createdAt doctorReviews owner').sort({ createdAt: -1 }).limit(300)
  res.json({
    reports: reports.map(report => {
      const review = reviewFor(report, req.user.clinicianId)
      const details = report.toJSON()
      delete details.doctorReviews
      return { ...details, patient: report.owner, review: review || null, status: review?.status || 'pending' }
    }),
  })
}

exports.reviewReport = async (req, res) => {
  if (!isObjectId(req.params.reportId)) throw httpErr(404, 'Report not found')
  const clinician = await Clinician.findById(req.user.clinicianId)
  const patientIds = await patientIdsFor(clinician)
  const report = await MedicalReport.findOne({ _id: req.params.reportId, owner: { $in: patientIds } })
  if (!report) throw httpErr(404, 'Report not found')
  const { comment = '', status = 'reviewed' } = req.body || {}
  if (!['pending', 'reviewed'].includes(status)) throw httpErr(400, 'Select a valid report status')
  if (typeof comment !== 'string' || comment.length > 2000) throw httpErr(400, 'Doctor comment must be 2,000 characters or fewer')
  let review = reviewFor(report, clinician._id)
  if (review) {
    review.status = status
    review.comment = comment.trim()
    review.reviewedAt = status === 'reviewed' ? new Date() : null
  } else {
    report.doctorReviews.push({ clinicianId: clinician._id, status, comment: comment.trim(), reviewedAt: status === 'reviewed' ? new Date() : null })
  }
  await report.save()
  await audit(req, report.owner, 'REPORT_REVIEW')
  res.json({ report: { _id: report._id, status, review: reviewFor(report, clinician._id) } })
}

exports.downloadReport = async (req, res) => {
  if (!isObjectId(req.params.reportId)) throw httpErr(404, 'Report not found')
  const clinician = await Clinician.findById(req.user.clinicianId)
  const patientIds = await patientIdsFor(clinician)
  const report = await MedicalReport.findOne({ _id: req.params.reportId, owner: { $in: patientIds } })
  if (!report) throw httpErr(404, 'Report not found')
  const file = path.join(STORAGE_DIR, path.basename(report.storedName))
  if (!fs.existsSync(file)) throw httpErr(410, 'The stored report file is missing')
  const inline = req.query.disposition === 'inline'
  res.setHeader('Content-Type', report.mimeType)
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Cache-Control', 'private, no-store')
  res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="report"; filename*=UTF-8''${encodeURIComponent(report.originalName)}`)
  await audit(req, report.owner, 'REPORT_READ')
  fs.createReadStream(file).pipe(res)
}

exports.profile = async (req, res) => {
  const clinician = await Clinician.findById(req.user.clinicianId)
  res.json({ clinician })
}
