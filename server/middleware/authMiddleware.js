const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const User = require('../models/User')
const Clinician = require('../models/Clinician')

exports.authenticate = async (req, res, next) => {
  const token = req.cookies?.token || req.cookies?.clinician_token
  if (!token) return res.status(401).json({ message: 'Authentication required' })
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    if (decoded.role === 'Doctor' || decoded.role === 'clinician') {
      const clinicianId = decoded.clinicianId || decoded.id
      if (!mongoose.isValidObjectId(clinicianId)) return res.status(401).json({ message: 'Session expired or invalid. Please log in again.' })
      const clinician = await Clinician.findById(clinicianId)
      if (!clinician) return res.status(401).json({ message: 'Account no longer exists' })
      const data = clinician.toJSON()
      req.user = {
        ...data,
        id: clinician._id.toString(),
        role: 'Doctor',
      }
    } else if (decoded.role === 'Patient' || !decoded.role) {
      if (!mongoose.isValidObjectId(decoded.id)) return res.status(401).json({ message: 'Session expired or invalid. Please log in again.' })
      const patient = await User.findById(decoded.id)
      if (!patient) return res.status(401).json({ message: 'Account no longer exists' })
      req.user = {
        ...patient.toJSON(),
        id: patient._id.toString(),
        role: 'Patient',
      }
    } else {
      return res.status(403).json({ message: 'This account cannot access MedLink' })
    }
    return next()
  } catch {
    return res.status(401).json({ message: 'Session expired or invalid. Please log in again.' })
  }
}

exports.protect = async (req, res, next) => {
  try {
    const token = req.cookies.token
    if (!token) return res.status(401).json({ message: 'Authentication required' })
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    if (decoded.role && decoded.role !== 'Patient') {
      return res.status(403).json({ code: 'INVALID_ROLE', message: 'A patient account is required' })
    }
    const { id } = decoded
    const user = await User.findById(id)
    if (!user) return res.status(401).json({ message: 'Account no longer exists' })
    req.user = user
    next()
  } catch { res.status(401).json({ message: 'Session expired or invalid. Please log in again.' }) }
}
// CSRF defence: cookies are SameSite=Lax, CORS is limited to CLIENT_URL, and every state-changing
// request must carry a custom header that cross-site forms cannot send (and that triggers a CORS preflight).
exports.csrfGuard = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
  if (req.get('X-Requested-With') !== 'XMLHttpRequest') return res.status(403).json({ message: 'Missing CSRF header' })
  next()
}
