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
  phone: clinician.phone || '',
  experienceYears: clinician.experienceYears || 0,
  about: clinician.about || '',
  avatarUrl: clinician.avatarUrl || '',
  role: 'clinician',
})

exports.register = async (req, res) => {
  const body = req.body
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw httpErr(400, 'Enter valid clinician details')
  const { name, email, password, licenseNumber, specialization, hospital } = body
  const phone = body.phone === undefined ? '' : body.phone
  if ([name, email, password, licenseNumber, specialization, hospital, phone].some(value => typeof value !== 'string')) {
    throw httpErr(400, 'Name, email, password, license, specialization and hospital are required')
  }
  if (name.trim().length < 2 || name.trim().length > 100) throw httpErr(400, 'Name must be between 2 and 100 characters')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.trim().length > 254) throw httpErr(400, 'Enter a valid email address')
  if (password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) throw httpErr(400, 'Password must be at least 12 characters and no more than 72 UTF-8 bytes')
  if (licenseNumber.trim().length < 3 || licenseNumber.trim().length > 60) throw httpErr(400, 'Enter a valid medical license number')
  if (!specialization.trim() || specialization.trim().length > 120) throw httpErr(400, 'Specialization is required')
  if (!hospital.trim() || hospital.trim().length > 160) throw httpErr(400, 'Hospital is required')
  if (phone.trim() && (phone.trim().replace(/\D/g, '').length < 10 || phone.trim().replace(/\D/g, '').length > 15)) throw httpErr(400, 'Enter a valid phone number')

  const clinician = await Clinician.create({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: await bcrypt.hash(password, 12),
    licenseNumber: licenseNumber.trim().toUpperCase(),
    specialization: specialization.trim(),
    hospital: hospital.trim(),
    phone: phone.trim(),
    role: 'clinician',
  })
  res.status(201).json({
    message: 'Registration successful. You can now sign in.',
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
  const token = jwt.sign(
    { role: 'clinician', clinicianId: clinician._id.toString() },
    process.env.JWT_SECRET,
    { expiresIn: '8h' },
  )
  res.cookie('clinician_token', token, cookieOptions())
  res.json({ clinician: publicClinician(clinician) })
}

exports.me = (req, res) => res.json({ clinician: req.user })

exports.updateProfile = async (req, res) => {
  const { name, phone = '', licenseNumber, specialization, hospital, experienceYears = 0, about = '', avatarUrl = '' } = req.body || {}
  if ([name, phone, licenseNumber, specialization, hospital, about, avatarUrl].some(value => typeof value !== 'string')) {
    throw httpErr(400, 'Enter valid profile details')
  }
  if (name.trim().length < 2 || name.trim().length > 100) throw httpErr(400, 'Name must be between 2 and 100 characters')
  if (phone.trim() && (phone.trim().replace(/\D/g, '').length < 10 || phone.trim().replace(/\D/g, '').length > 15)) throw httpErr(400, 'Enter a valid phone number')
  if (licenseNumber.trim().length < 3 || licenseNumber.trim().length > 60) throw httpErr(400, 'Enter a valid medical license number')
  if (!specialization.trim() || specialization.trim().length > 120) throw httpErr(400, 'Specialization is required')
  if (!hospital.trim() || hospital.trim().length > 160) throw httpErr(400, 'Hospital is required')
  if (!Number.isInteger(experienceYears) || experienceYears < 0 || experienceYears > 80) throw httpErr(400, 'Experience must be a whole number from 0 to 80')
  if (about.length > 2000) throw httpErr(400, 'About must be 2,000 characters or fewer')
  if (avatarUrl.length > 2000 || (avatarUrl && !/^https?:\/\/\S+$/i.test(avatarUrl))) throw httpErr(400, 'Enter a valid profile photo URL')

  const clinician = await Clinician.findById(req.user.clinicianId)
  clinician.set({
    name: name.trim(),
    phone: phone.trim(),
    licenseNumber: licenseNumber.trim().toUpperCase(),
    specialization: specialization.trim(),
    hospital: hospital.trim(),
    experienceYears,
    about: about.trim(),
    avatarUrl: avatarUrl.trim(),
  })
  try {
    await clinician.save()
  } catch (error) {
    if (error.code === 11000) throw httpErr(409, 'That medical license number is already registered')
    throw error
  }
  res.json({ message: 'Doctor profile updated', clinician: publicClinician(clinician) })
}

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body || {}
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') throw httpErr(400, 'Enter your current and new password')
  if (newPassword.length < 12 || Buffer.byteLength(newPassword, 'utf8') > 72) throw httpErr(400, 'New password must be at least 12 characters and no more than 72 UTF-8 bytes')
  const clinician = await Clinician.findById(req.user.clinicianId).select('+password')
  if (!clinician || !(await bcrypt.compare(currentPassword, clinician.password))) throw httpErr(401, 'Current password is incorrect')
  clinician.password = await bcrypt.hash(newPassword, 12)
  await clinician.save()
  res.json({ message: 'Password updated' })
}

exports.logout = (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  })
  res.clearCookie('clinician_token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  })
  res.json({ message: 'Clinician signed out' })
}
