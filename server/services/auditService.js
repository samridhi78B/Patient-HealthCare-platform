const AuditLog = require('../models/AuditLog')

const httpErr = (status, message, code) => Object.assign(new Error(message), { status, code })

function requestDetails(req) {
  return {
    ip: String(req.ip || '').slice(0, 100),
    userAgent: String(req.get('user-agent') || '').slice(0, 500),
  }
}

async function logClinicianAction(req, patientId, action, reason = '') {
  const clinicianId = req.user?.clinicianId
  const licenseNumber = req.user?.licenseNumber
  if (!clinicianId || !licenseNumber) {
    throw httpErr(403, 'Clinician identity is required before accessing patient records', 'INVALID_ROLE')
  }
  const details = requestDetails(req)
  return AuditLog.create({
    clinicianId,
    clinicianLicenseNumber: licenseNumber,
    patientId,
    action,
    actorType: 'clinician',
    actorId: clinicianId,
    reason,
    ...details,
  })
}

async function logPatientAction(req, patientId, action) {
  const details = requestDetails(req)
  return AuditLog.create({
    patientId,
    action,
    actorType: 'patient',
    actorId: patientId,
    ...details,
  })
}

module.exports = { logClinicianAction, logPatientAction, httpErr }
