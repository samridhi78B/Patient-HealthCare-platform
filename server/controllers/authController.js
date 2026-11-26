const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const Clinician = require('../models/Clinician')
const publicUser = u => ({ id: u._id, name: u.name, email: u.email, phone: u.phone, createdAt: u.createdAt, role: 'Patient' })
const publicDoctor = clinician => ({
  id: clinician._id,
  name: clinician.name,
  email: clinician.email,
  phone: clinician.phone || '',
  licenseNumber: clinician.licenseNumber,
  specialization: clinician.specialization,
  hospital: clinician.hospital,
  experienceYears: clinician.experienceYears || 0,
  about: clinician.about || '',
  avatarUrl: clinician.avatarUrl || '',
  role: 'Doctor',
})
const cookieOpts = remember => ({
  httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/',
  ...(remember ? { maxAge: Number(process.env.REMEMBER_ME_DAYS || 14) * 864e5 } : {}),
})
const issue = (res, payload, remember) => {
  const expiresIn = remember ? `${process.env.REMEMBER_ME_DAYS || 14}d` : process.env.JWT_EXPIRES_IN || '2h'
  res.cookie('token', jwt.sign(payload, process.env.JWT_SECRET, { expiresIn }), cookieOpts(remember))
}
exports.register = async (req, res) => {
  const { name, email, phone, password } = req.body
  const normalizedEmail = email.trim().toLowerCase()
  if (await User.findOne({ email: normalizedEmail })) return res.status(409).json({ message: 'An account with this email already exists' })
  const user = await User.create({ name, email: normalizedEmail, phone, password: await bcrypt.hash(password, 12) })
  res.status(201).json({ message: 'Account created. You can now log in.', user: publicUser(user) })
}
exports.login = async (req, res) => {
  const { email, password, remember } = req.body
  const normalizedEmail = email.trim().toLowerCase()
  const [patient, clinician] = await Promise.all([
    User.findOne({ email: normalizedEmail }).select('+password'),
    Clinician.findOne({ email: normalizedEmail }).select('+password'),
  ])
  const [patientMatches, doctorMatches] = await Promise.all([
    patient ? bcrypt.compare(password, patient.password) : false,
    clinician ? bcrypt.compare(password, clinician.password) : false,
  ])
  if (patientMatches && doctorMatches) {
    return res.status(409).json({ message: 'This email is associated with more than one account. Contact support to resolve it.' })
  }
  if (!patientMatches && !doctorMatches) return res.status(401).json({ message: 'Invalid email or password' })
  if (doctorMatches) {
    const user = publicDoctor(clinician)
    issue(res, { role: 'Doctor', clinicianId: clinician._id.toString() }, !!remember)
    return res.json({ user, role: user.role })
  }
  const user = publicUser(patient)
  issue(res, { role: 'Patient', id: patient._id.toString() }, !!remember)
  res.json({ user, role: user.role })
}
exports.logout = (req, res) => {
  res.clearCookie('token', cookieOpts(false))
  res.clearCookie('clinician_token', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' })
  res.json({ message: 'Logged out' })
}
exports.me = (req, res) => res.json({ user: req.user, role: req.user.role })
