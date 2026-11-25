const crypto = require('crypto')
const QRCode = require('qrcode')
const User = require('../models/User')
const MedicalReport = require('../models/MedicalReport')
const EmergencyAccessSession = require('../models/EmergencyAccessSession')
const MedicalHistoryItem = require('../models/MedicalHistoryItem')
const { logPatientAction, httpErr } = require('./auditService')

const QR_LIFETIME_MS = 365 * 24 * 60 * 60 * 1000
const ACCESS_LIFETIME_MS = 10 * 60 * 1000
const randomToken = () => crypto.randomBytes(32).toString('base64url')
const hashToken = token => crypto.createHash('sha256').update(token).digest('hex')

function encryptionKey() {
  return crypto.createHmac('sha256', process.env.JWT_SECRET)
    .update('medlink-emergency-qr-encryption-v1')
    .digest()
}

function encryptToken(token) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()])
  return {
    encrypted: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
  }
}

function decryptToken(user) {
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(user.emergencyQrTokenIv, 'base64'))
    decipher.setAuthTag(Buffer.from(user.emergencyQrTokenTag, 'base64'))
    return Buffer.concat([
      decipher.update(Buffer.from(user.emergencyQrTokenEncrypted, 'base64')),
      decipher.final(),
    ]).toString('utf8')
  } catch {
    throw httpErr(500, 'The emergency QR credential could not be decrypted')
  }
}

async function issueQr(user, req) {
  await EmergencyAccessSession.updateMany(
    { patientId: user._id, revokedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { revokedAt: new Date() } },
  )
  const token = randomToken()
  const encrypted = encryptToken(token)
  user.emergencyQrTokenHash = hashToken(token)
  user.emergencyQrTokenEncrypted = encrypted.encrypted
  user.emergencyQrTokenIv = encrypted.iv
  user.emergencyQrTokenTag = encrypted.tag
  user.emergencyQrExpiresAt = new Date(Date.now() + QR_LIFETIME_MS)
  await user.save()
  await logPatientAction(req, user._id, 'QR_ISSUE')
  return token
}

async function getQrForPatient(user, req, forceIssue = false) {
  const current = user.emergencyQrTokenHash && user.emergencyQrExpiresAt > new Date()
  const token = current && !forceIssue ? decryptToken(user) : await issueQr(user, req)
  const url = new URL(`/emergency/${encodeURIComponent(token)}`, process.env.CLIENT_URL).toString()
  const qrCodeDataUrl = await QRCode.toDataURL(url, { errorCorrectionLevel: 'M', width: 256, margin: 2 })
  return { qrCodeDataUrl, expiresAt: user.emergencyQrExpiresAt, active: true }
}

async function revokeQr(user, req) {
  if (!user.emergencyQrTokenHash) throw httpErr(409, 'There is no active emergency QR code to revoke')
  await EmergencyAccessSession.updateMany(
    { patientId: user._id, revokedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { revokedAt: new Date() } },
  )
  user.emergencyQrTokenHash = null
  user.emergencyQrTokenEncrypted = null
  user.emergencyQrTokenIv = null
  user.emergencyQrTokenTag = null
  user.emergencyQrExpiresAt = null
  await user.save()
  await logPatientAction(req, user._id, 'QR_REVOKE')
}

async function openEmergencyAccess({ patient, clinician, reason }) {
  const token = randomToken()
  const expiresAt = new Date(Date.now() + ACCESS_LIFETIME_MS)
  await EmergencyAccessSession.create({
    tokenHash: hashToken(token),
    patientId: patient._id,
    clinicianId: clinician.clinicianId,
    reason,
    expiresAt,
  })
  return { token, expiresAt }
}

async function emergencySummary(patient) {
  const [items, reports] = await Promise.all([
    MedicalHistoryItem.find({ owner: patient._id })
      .sort({ observedAt: -1, createdAt: -1 })
      .limit(30)
      .populate('report', 'title originalName category createdAt')
      .populate('createdByClinician', 'name licenseNumber specialization')
      .populate('verifiedByClinician', 'name licenseNumber'),
    MedicalReport.find({ owner: patient._id })
      .select('title originalName testResults')
      .sort({ createdAt: -1 })
      .limit(20),
  ])

  const history = items.map(item => ({
    id: item._id,
    type: item.type,
    title: item.title,
    value: item.value || '',
    unit: item.unit || '',
    referenceRange: item.referenceRange || '',
    details: item.details || '',
    evidence: item.evidence || '',
    source: item.source,
    verificationStatus: item.verificationStatus,
    observedAt: item.observedAt,
    sourceReport: item.report ? {
      id: item.report._id,
      title: item.report.title,
      originalName: item.report.originalName,
    } : item.sourceReportTitle ? { title: item.sourceReportTitle, deleted: true } : null,
    createdByClinician: item.createdByClinician,
    verifiedByClinician: item.verifiedByClinician,
  }))

  const patientEnteredResults = reports.flatMap(report => report.testResults.map(result => ({
    id: result._id,
    type: 'parameter',
    title: result.testName,
    value: String(result.value),
    unit: result.unit,
    referenceRange: '',
    details: 'Value entered by the patient. A reference range was not provided.',
    evidence: '',
    source: 'patient-entered',
    verificationStatus: 'unreviewed',
    observedAt: result.testDate,
    sourceReport: { id: report._id, title: report.title, originalName: report.originalName },
    createdByClinician: null,
    verifiedByClinician: null,
  }))).slice(0, 50)
  const combinedHistory = [...history, ...patientEnteredResults]
    .sort((left, right) => new Date(right.observedAt || 0) - new Date(left.observedAt || 0))
    .slice(0, 30)
  const listOrNotProvided = values => values?.length ? values : ['Not provided']
  return {
    patient: {
      id: patient._id,
      name: patient.name || 'Not provided',
      dateOfBirth: patient.dateOfBirth || 'Not provided',
      gender: patient.gender || 'Not provided',
      phone: patient.phone || 'Not provided',
    },
    bloodGroup: patient.bloodGroup || 'Not provided',
    allergies: listOrNotProvided(patient.allergies),
    currentMedications: listOrNotProvided(patient.currentMedications),
    medicalConditions: listOrNotProvided(patient.medicalConditions),
    emergencyContacts: patient.emergencyContacts?.length ? patient.emergencyContacts : [{ name: 'Not provided', relationship: '', phone: 'Not provided' }],
    medicalNotes: patient.medicalNotes || 'Not provided',
    profileSource: 'Patient-entered profile information',
    history: combinedHistory,
    recentObservations: combinedHistory.filter(item => ['parameter', 'observation', 'reported-diagnosis'].includes(item.type)).slice(0, 10),
  }
}

async function findActiveSession(token, clinicianId) {
  if (typeof token !== 'string' || token.length < 40) throw httpErr(401, 'Emergency access session is missing or invalid')
  const session = await EmergencyAccessSession.findOne({
    tokenHash: hashToken(token),
    clinicianId,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  }).select('+tokenHash')
  if (!session) throw httpErr(403, 'Emergency access has expired or been revoked')
  return session
}

module.exports = {
  ACCESS_LIFETIME_MS,
  hashToken,
  randomToken,
  getQrForPatient,
  issueQr,
  revokeQr,
  openEmergencyAccess,
  emergencySummary,
  findActiveSession,
}
