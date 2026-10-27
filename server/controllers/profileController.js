const mongoose = require('mongoose')

const httpErr = (status, message) => Object.assign(new Error(message), { status })
const PROFILE_FIELDS = ['name', 'phone', 'dateOfBirth', 'gender', 'address', 'bloodGroup', 'allergies', 'medicalConditions', 'currentMedications', 'emergencyContacts', 'medicalNotes']
const validPhone = value => typeof value === 'string' && /^\+?[\d\s()-]{10,20}$/.test(value) && (value.match(/\d/g) || []).length >= 10 && (value.match(/\d/g) || []).length <= 15
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)) && new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value
const cleanList = (value, field) => {
  if (!Array.isArray(value) || value.length > 50 || value.some(item => typeof item !== 'string' || item.trim().length > 120)) {
    throw httpErr(400, `${field} must be a list of up to 50 entries, each 120 characters or fewer`)
  }
  return value.map(item => item.trim()).filter(Boolean)
}
const publicProfile = user => ({
  name: user.name,
  phone: user.phone,
  dateOfBirth: user.dateOfBirth,
  gender: user.gender,
  address: user.address,
  bloodGroup: user.bloodGroup,
  allergies: user.allergies,
  medicalConditions: user.medicalConditions,
  currentMedications: user.currentMedications,
  emergencyContacts: user.emergencyContacts,
  medicalNotes: user.medicalNotes,
  updatedAt: user.updatedAt,
})

exports.get = async (req, res) => {
  const user = await mongoose.model('User').findById(req.user._id)
  if (!user) throw httpErr(404, 'Patient profile not found')
  res.json({ profile: publicProfile(user) })
}

exports.update = async (req, res) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) throw httpErr(400, 'Invalid profile details')
  const unknown = Object.keys(req.body).filter(key => !PROFILE_FIELDS.includes(key))
  if (unknown.length) throw httpErr(400, `Unsupported profile field: ${unknown[0]}`)

  const { name, phone, dateOfBirth, gender, address, bloodGroup, medicalNotes } = req.body
  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) throw httpErr(400, 'Full name must be between 2 and 80 characters')
  if (!validPhone(phone)) throw httpErr(400, 'Enter a valid phone number (10-15 digits)')
  if (dateOfBirth !== '' && dateOfBirth !== null && (typeof dateOfBirth !== 'string' || !validDate(dateOfBirth) || new Date(`${dateOfBirth}T00:00:00.000Z`) > new Date())) {
    throw httpErr(400, 'Enter a valid date of birth that is not in the future')
  }
  if (gender !== undefined && (typeof gender !== 'string' || gender.length > 40)) throw httpErr(400, 'Enter a valid gender')
  if (typeof address !== 'string' || address.length > 500) throw httpErr(400, 'Address must be 500 characters or fewer')
  if (!['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(bloodGroup)) throw httpErr(400, 'Select a valid blood group')
  if (typeof medicalNotes !== 'string' || medicalNotes.length > 5000) throw httpErr(400, 'Medical notes must be 5,000 characters or fewer')
  if (!Array.isArray(req.body.emergencyContacts) || req.body.emergencyContacts.length > 10) throw httpErr(400, 'Add no more than 10 emergency contacts')
  const emergencyContacts = req.body.emergencyContacts.map(contact => {
    if (!contact || typeof contact !== 'object' || Array.isArray(contact)) throw httpErr(400, 'Enter valid emergency contact details')
    const { name: contactName, relationship = '', phone: contactPhone } = contact
    if (typeof contactName !== 'string' || contactName.trim().length < 2 || contactName.trim().length > 80) throw httpErr(400, 'Emergency contact name must be between 2 and 80 characters')
    if (typeof relationship !== 'string' || relationship.length > 60) throw httpErr(400, 'Emergency contact relationship must be 60 characters or fewer')
    if (!validPhone(contactPhone)) throw httpErr(400, 'Enter a valid emergency contact phone number (10-15 digits)')
    return { name: contactName.trim(), relationship: relationship.trim(), phone: contactPhone.trim() }
  })
  const updates = {
    name: name.trim(),
    phone: phone.trim(),
    dateOfBirth: dateOfBirth ? new Date(`${dateOfBirth}T00:00:00.000Z`) : null,
    address: address.trim(),
    bloodGroup,
    allergies: cleanList(req.body.allergies, 'Allergies'),
    medicalConditions: cleanList(req.body.medicalConditions, 'Medical conditions'),
    currentMedications: cleanList(req.body.currentMedications, 'Current medications'),
    emergencyContacts,
    medicalNotes: medicalNotes.trim(),
  }
  if (gender !== undefined) updates.gender = gender.trim()
  const user = await mongoose.model('User').findByIdAndUpdate(req.user._id, { $set: updates }, { new: true, runValidators: true })
  if (!user) throw httpErr(404, 'Patient profile not found')
  res.json({ message: 'Patient profile updated', profile: publicProfile(user) })
}
