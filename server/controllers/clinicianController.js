const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const Clinician = require('../models/Clinician')

const httpErr = (status, message) => Object.assign(new Error(message), { status })
const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 8 * 60 * 60 * 1000,
})
const publicClinician = clinician => ({
  id: clinician._id,
  name: clinician.name,
  email: clinician.email,
  licenseNumber: clinician.licenseNumber,
  specialization: clinician.specialization,
  hospital: clinician.hospital,
  role: 'clinician',
  isVerified: clinician.isVerified,
})

exports.register = async (req, res) => {
  const body = req.body
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw httpErr(400, 'Enter valid clinician details')
  const { name, email, password, licenseNumber, specialization, hospital } = body
  if ([name, email, password, licenseNumber, specialization, hospital].some(value => typeof value !== 'string')) {
    throw httpErr(400, 'Name, email, password, license, specialization and hospital are required')
  }
  if (name.trim().length < 2 || name.trim().length > 100) throw httpErr(400, 'Name must be between 2 and 100 characters')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.trim().length > 254) throw httpErr(400, 'Enter a valid email address')
  if (password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) throw httpErr(400, 'Password must be at least 12 characters and no more than 72 UTF-8 bytes')
  if (licenseNumber.trim().length < 3 || licenseNumber.trim().length > 60) throw httpErr(400, 'Enter a valid medical license number')
  if (!specialization.trim() || specialization.trim().length > 120) throw httpErr(400, 'Specialization is required')
  if (!hospital.trim() || hospital.trim().length > 160) throw httpErr(400, 'Hospital is required')

  const clinician = await Clinician.create({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: await bcrypt.hash(password, 12),
    licenseNumber: licenseNumber.trim().toUpperCase(),
    specialization: specialization.trim(),
    hospital: hospital.trim(),
    role: 'clinician',
    isVerified: false,
  })
  res.status(201).json({
    message: 'Registration submitted. An administrator must verify your clinician account before sign-in.',
    clinician: publicClinician(clinician),
  })
}

exports.login = async (req, res) => {
  const { email, password } = req.body || {}
  if (typeof email !== 'string' || typeof password !== 'string') throw httpErr(400, 'Enter your email and password')
  if (email.length > 254 || Buffer.byteLength(password, 'utf8') > 72) throw httpErr(400, 'Enter a valid email address and password')
  const clinician = await Clinician.findOne({ email: email.trim().toLowerCase() }).select('+password')
  if (!clinician || !(await bcrypt.compare(password, clinician.password))) {
    return res.status(401).json({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' })
  }
  if (!clinician.isVerified) {
    return res.status(403).json({ code: 'NOT_VERIFIED', message: 'Your clinician account is awaiting verification' })
  }

  const token = jwt.sign(
    { role: 'clinician', clinicianId: clinician._id.toString() },
    process.env.JWT_SECRET,
    { expiresIn: '8h' },
  )
  res.cookie('clinician_token', token, cookieOptions())
  res.json({ clinician: publicClinician(clinician) })
}

exports.me = (req, res) => res.json({ clinician: req.user })

exports.logout = (req, res) => {
  res.clearCookie('clinician_token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  })
  res.json({ message: 'Clinician signed out' })
}
