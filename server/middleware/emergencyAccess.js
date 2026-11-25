const { findActiveSession } = require('../services/emergencyService')
const { httpErr } = require('../services/auditService')

exports.requireEmergencySession = async (req, res, next) => {
  try {
    if (!req.user?.clinicianId) throw httpErr(403, 'Clinician identity is required', 'INVALID_ROLE')
    if (!req.user.permissions?.includes('emergency:read')) {
      throw httpErr(403, 'This clinician does not have emergency record access', 'MISSING_PERMISSION')
    }
    const token = req.get('X-Emergency-Access-Token')
    req.emergencyAccess = await findActiveSession(token, req.user.clinicianId)
    return next()
  } catch (error) {
    return next(error)
  }
}
