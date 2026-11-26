const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const Clinician = require('../models/Clinician')

const permissions = Object.freeze([
  'emergency:read',
  'emergency:qr_issue',
  'emergency:qr_revoke',
  'patient:summary_read',
  'history:verify',
  'history:write',
])

exports.requireClinician = async (req, res, next) => {
  const sharedToken = req.cookies?.token
  const legacyToken = req.cookies?.clinician_token
  const token = sharedToken || legacyToken
  if (!token) {
    return res.status(401).json({ code: 'AUTH_REQUIRED', message: 'Clinician sign-in is required' })
  }

  let decoded
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    return res.status(401).json({ code: 'INVALID_SESSION', message: 'Clinician session is expired or invalid' })
  }

  const legacyClinicianSession = !sharedToken && decoded.role === 'clinician'
  const clinicianId = decoded.clinicianId || (legacyClinicianSession ? decoded.id : null)
  if ((!legacyClinicianSession && decoded.role !== 'Doctor') || !mongoose.isValidObjectId(clinicianId)) {
    return res.status(403).json({ code: 'INVALID_ROLE', message: 'A clinician account is required' })
  }

  try {
    const clinician = await Clinician.findById(clinicianId)
    if (!clinician || clinician.role !== 'clinician') {
      return res.status(403).json({ code: 'CLINICIAN_NOT_FOUND', message: 'Clinician account is not available' })
    }
    req.user = {
      id: clinician._id.toString(),
      clinicianId: clinician._id.toString(),
      name: clinician.name,
      email: clinician.email,
      role: legacyClinicianSession ? 'clinician' : 'Doctor',
      licenseNumber: clinician.licenseNumber,
      permissions,
    }
    return next()
  } catch (error) {
    return next(error)
  }
}
