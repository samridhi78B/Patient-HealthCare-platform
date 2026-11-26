const fs = require('fs')
const path = require('path')
const mongoose = require('mongoose')
const User = require('../models/User')
const MedicalReport = require('../models/MedicalReport')
const MedicalHistoryItem = require('../models/MedicalHistoryItem')
const EmergencyAccessSession = require('../models/EmergencyAccessSession')
const { STORAGE_DIR } = require('../middleware/upload')
const {
  hashToken,
  openEmergencyAccess,
  emergencySummary,
} = require('../services/emergencyService')
const { logClinicianAction, httpErr } = require('../services/auditService')

const HISTORY_TYPES = ['diagnosis', 'prescription', 'consultation', 'surgery', 'procedure', 'observation']
const reportFilePath = report => path.join(STORAGE_DIR, path.basename(report.storedName))
const validDate = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value && parsed <= new Date()
}

function assertClinician(req) {
  if (!req.user?.clinicianId) throw httpErr(403, 'Clinician identity is required before accessing patient records', 'INVALID_ROLE')
}

function assertWritable(req) {
  if (req.emergencyAccess?.readOnly !== false) throw httpErr(403, 'QR emergency summaries are read-only', 'READ_ONLY_SESSION')
}

exports.open = async (req, res) => {
  assertClinician(req)
  const { qrToken, patientId, reason } = req.body || {}
  if (typeof reason !== 'string' || !reason.trim() || reason.trim().length > 500) {
    throw httpErr(400, 'Enter a brief reason for emergency access (up to 500 characters)')
  }
  if (Boolean(qrToken) === Boolean(patientId)) throw httpErr(400, 'Provide either a QR token or a patient ID')

  let patient
  if (qrToken) {
    if (typeof qrToken !== 'string' || !/^[A-Za-z0-9_-]{40,50}$/.test(qrToken)) {
      throw httpErr(404, 'Emergency QR code is invalid, expired or revoked')
    }
    patient = await User.findOne({
      emergencyQrTokenHash: hashToken(qrToken),
      emergencyQrExpiresAt: { $gt: new Date() },
    })
  } else {
    if (typeof patientId !== 'string' || !mongoose.isValidObjectId(patientId)) throw httpErr(404, 'Patient not found')
    patient = await User.findById(patientId)
  }
  if (!patient) throw httpErr(404, 'Emergency QR code is invalid, expired or revoked')

  const readOnly = Boolean(qrToken || req.body.readOnly)
  const summary = await emergencySummary(patient, { readOnly })
  const session = await openEmergencyAccess({ patient, clinician: req.user, reason: reason.trim(), readOnly })
  await logClinicianAction(req, patient._id, 'SUMMARY_VIEW', reason.trim())
  res.set('Cache-Control', 'private, no-store')
  res.json({ accessToken: session.token, expiresAt: session.expiresAt, summary })
}

exports.summary = async (req, res) => {
  assertClinician(req)
  const patient = await User.findById(req.emergencyAccess.patientId)
  if (!patient) throw httpErr(404, 'Patient not found')
  const summary = await emergencySummary(patient, { readOnly: req.emergencyAccess.readOnly })
  await logClinicianAction(req, patient._id, 'SUMMARY_VIEW', req.emergencyAccess.reason)
  res.set('Cache-Control', 'private, no-store')
  res.json({ summary, expiresAt: req.emergencyAccess.expiresAt })
}

exports.closeSession = async (req, res) => {
  assertClinician(req)
  await EmergencyAccessSession.updateOne(
    { _id: req.emergencyAccess._id, clinicianId: req.user.clinicianId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  )
  await logClinicianAction(req, req.emergencyAccess.patientId, 'ACCESS_SESSION_CLOSE', req.emergencyAccess.reason)
  res.json({ message: 'Emergency access session closed' })
}

exports.records = async (req, res) => {
  assertClinician(req)
  assertWritable(req)
  const patientId = req.emergencyAccess.patientId
  const [reports, items] = await Promise.all([
    MedicalReport.find({ owner: patientId })
      .select('title originalName category mimeType size testResults createdAt')
      .sort({ createdAt: -1 }),
    MedicalHistoryItem.find({ owner: patientId })
      .select('-owner -sourceKey')
      .sort({ observedAt: -1, createdAt: -1 })
      .populate('report', 'title originalName')
      .populate('createdByClinician', 'name licenseNumber specialization')
      .populate('verifiedByClinician', 'name licenseNumber'),
  ])
  await logClinicianAction(req, patientId, 'EMERGENCY_READ', req.emergencyAccess.reason)
  res.set('Cache-Control', 'private, no-store')
  res.json({ reports, history: items, expiresAt: req.emergencyAccess.expiresAt })
}

exports.downloadReport = async (req, res) => {
  assertClinician(req)
  assertWritable(req)
  if (!mongoose.isValidObjectId(req.params.reportId)) throw httpErr(404, 'Report not found')
  const report = await MedicalReport.findOne({ _id: req.params.reportId, owner: req.emergencyAccess.patientId })
  if (!report) throw httpErr(404, 'Report not found')
  const file = reportFilePath(report)
  if (!fs.existsSync(file)) throw httpErr(410, 'The stored report file is missing')
  await logClinicianAction(req, report.owner, 'EMERGENCY_READ', req.emergencyAccess.reason)
  res.set({
    'Content-Type': report.mimeType,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'private, no-store',
    'Content-Disposition': `attachment; filename="report"; filename*=UTF-8''${encodeURIComponent(report.originalName)}`,
  })
  fs.createReadStream(file).pipe(res)
}

exports.verifyHistoryItem = async (req, res) => {
  assertClinician(req)
  assertWritable(req)
  if (!req.user.permissions.includes('history:verify')) throw httpErr(403, 'History verification permission is required')
  if (!mongoose.isValidObjectId(req.params.itemId)) throw httpErr(404, 'Medical history item not found')
  const item = await MedicalHistoryItem.findOneAndUpdate(
    {
      _id: req.params.itemId,
      owner: req.emergencyAccess.patientId,
      source: 'report-extracted',
      verificationStatus: { $in: ['unreviewed', 'patient-reviewed'] },
    },
    {
      $set: {
        verificationStatus: 'clinician-verified',
        verifiedByClinician: req.user.clinicianId,
        verifiedAt: new Date(),
      },
    },
    { new: true },
  )
  if (!item) throw httpErr(404, 'Reviewable extracted finding not found')
  await logClinicianAction(req, item.owner, 'HISTORY_VERIFY', req.emergencyAccess.reason)
  res.json({ message: 'Finding marked as clinician-verified', item })
}

exports.addHistoryItem = async (req, res) => {
  assertClinician(req)
  assertWritable(req)
  if (!req.user.permissions.includes('history:write')) throw httpErr(403, 'Medical history write permission is required')
  const { type, title, details = '', observedAt = '' } = req.body || {}
  if (!HISTORY_TYPES.includes(type)) throw httpErr(400, 'Choose a supported medical record type')
  if (typeof title !== 'string' || title.trim().length < 2 || title.trim().length > 160) throw httpErr(400, 'Record title must be between 2 and 160 characters')
  if (typeof details !== 'string' || details.length > 2000) throw httpErr(400, 'Record details must be 2,000 characters or fewer')
  if (observedAt && !validDate(observedAt)) throw httpErr(400, 'Enter a valid record date that is not in the future')

  const item = await MedicalHistoryItem.create({
    owner: req.emergencyAccess.patientId,
    type,
    title: title.trim(),
    details: details.trim(),
    observedAt: observedAt ? new Date(`${observedAt}T00:00:00.000Z`) : null,
    source: 'clinician-entered',
    verificationStatus: 'clinician-verified',
    createdByClinician: req.user.clinicianId,
    verifiedByClinician: req.user.clinicianId,
    verifiedAt: new Date(),
  })
  await logClinicianAction(req, item.owner, 'MEDICAL_RECORD_CREATE', req.emergencyAccess.reason)
  res.status(201).json({ message: 'Clinician record added', item })
}

exports.patientAccessHistory = async (req, res) => {
  assertClinician(req)
  const AuditLog = require('../models/AuditLog')
  const entries = await AuditLog.find({ clinicianId: req.user.clinicianId })
    .sort({ timestamp: -1 })
    .limit(100)
    .populate('patientId', 'name')
  res.json({ entries })
}

exports.revokePatientQr = async (req, res) => {
  assertClinician(req)
  if (!req.user.permissions.includes('emergency:qr_revoke')) throw httpErr(403, 'QR revocation permission is required')
  if (!mongoose.isValidObjectId(req.params.patientId)) throw httpErr(404, 'Patient not found')
  const patient = await User.findById(req.params.patientId).select('+emergencyQrTokenHash')
  if (!patient || !patient.emergencyQrTokenHash) throw httpErr(404, 'Active QR credential not found')
  await logClinicianAction(req, patient._id, 'QR_REVOKE', 'Clinician revoked patient QR credential')
  await User.updateOne({ _id: patient._id }, { $set: {
    emergencyQrTokenHash: null,
    emergencyQrTokenEncrypted: null,
    emergencyQrTokenIv: null,
    emergencyQrTokenTag: null,
    emergencyQrExpiresAt: null,
  } })
  await EmergencyAccessSession.updateMany({ patientId: patient._id, revokedAt: null }, { $set: { revokedAt: new Date() } })
  res.json({ message: 'Patient QR credential revoked' })
}
