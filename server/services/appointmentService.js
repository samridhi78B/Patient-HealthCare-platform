const Hospital = require('../models/Hospital')
const Doctor = require('../models/Doctor')
const Appointment = require('../models/Appointment')

const sampleHospitals = [
  { slug: 'greenwood-medical-centre', name: 'Greenwood Medical Centre', location: 'Bengaluru', address: '18 Residency Road, Ashok Nagar, Bengaluru, Karnataka 560025', specialties: ['Cardiology', 'Dermatology', 'General Medicine'] },
  { slug: 'lakeside-city-hospital', name: 'Lakeside City Hospital', location: 'Hyderabad', address: '42 Necklace Road, Somajiguda, Hyderabad, Telangana 500082', specialties: ['Orthopedics', 'Pediatrics', 'General Medicine'] },
  { slug: 'sunrise-womens-hospital', name: 'Sunrise Women’s Hospital', location: 'Chennai', address: '7 Cathedral Road, Gopalapuram, Chennai, Tamil Nadu 600086', specialties: ['Gynecology', 'Pediatrics', 'Dermatology'] },
]
const sampleDoctors = [
  { name: 'Dr. Ananya Rao', specialty: 'Cardiology', qualifications: 'MBBS, MD (Cardiology)', experienceYears: 12, fee: 900, supportsOnline: true, hospitalSlug: 'greenwood-medical-centre', times: ['09:00', '10:30', '14:00', '15:30'] },
  { name: 'Dr. Kabir Shah', specialty: 'Dermatology', qualifications: 'MBBS, MD (Dermatology)', experienceYears: 9, fee: 700, supportsOnline: true, hospitalSlug: 'greenwood-medical-centre', times: ['09:30', '11:00', '13:30', '16:00'] },
  { name: 'Dr. Meera Iyer', specialty: 'General Medicine', qualifications: 'MBBS, DNB (Family Medicine)', experienceYears: 15, fee: 600, supportsOnline: true, hospitalSlug: 'greenwood-medical-centre', times: ['09:00', '11:30', '14:30', '16:30'] },
  { name: 'Dr. Arjun Reddy', specialty: 'Orthopedics', qualifications: 'MBBS, MS (Orthopedics)', experienceYears: 14, fee: 800, supportsOnline: false, hospitalSlug: 'lakeside-city-hospital', times: ['09:00', '10:00', '13:00', '15:00'] },
  { name: 'Dr. Nisha Menon', specialty: 'Pediatrics', qualifications: 'MBBS, MD (Pediatrics)', experienceYears: 11, fee: 650, supportsOnline: true, hospitalSlug: 'lakeside-city-hospital', times: ['09:30', '11:00', '14:00', '16:00'] },
  { name: 'Dr. Vikram Das', specialty: 'General Medicine', qualifications: 'MBBS, MD (Internal Medicine)', experienceYears: 8, fee: 550, supportsOnline: true, hospitalSlug: 'lakeside-city-hospital', times: ['09:00', '10:30', '13:30', '15:30'] },
  { name: 'Dr. Priya Nair', specialty: 'Gynecology', qualifications: 'MBBS, MS (Obstetrics & Gynecology)', experienceYears: 13, fee: 850, supportsOnline: true, hospitalSlug: 'sunrise-womens-hospital', times: ['09:00', '10:30', '14:00', '15:30'] },
  { name: 'Dr. Rohan Kapoor', specialty: 'Pediatrics', qualifications: 'MBBS, DCH', experienceYears: 10, fee: 600, supportsOnline: true, hospitalSlug: 'sunrise-womens-hospital', times: ['09:30', '11:00', '13:30', '16:00'] },
  { name: 'Dr. Leela Krishnan', specialty: 'Dermatology', qualifications: 'MBBS, MD (Dermatology)', experienceYears: 7, fee: 700, supportsOnline: true, hospitalSlug: 'sunrise-womens-hospital', times: ['09:00', '11:30', '14:30', '16:30'] },
]

function makeAvailability(times) {
  const days = []
  const start = new Date()
  start.setUTCHours(0, 0, 0, 0)
  for (let offset = 1; offset <= 30; offset += 1) {
    const date = new Date(start)
    date.setUTCDate(date.getUTCDate() + offset)
    if (date.getUTCDay() !== 0) days.push({ date: date.toISOString().slice(0, 10), times })
  }
  return days
}

async function initializeAppointmentCatalog() {
  const hospitals = new Map()
  for (const item of sampleHospitals) {
    const hospital = await Hospital.findOneAndUpdate(
      { slug: item.slug },
      { $set: { ...item, isDemo: true } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )
    hospitals.set(item.slug, hospital)
  }
  for (const item of sampleDoctors) {
    const { hospitalSlug, times, ...details } = item
    await Doctor.findOneAndUpdate(
      { name: details.name, hospital: hospitals.get(hospitalSlug)._id },
      { $set: { ...details, hospital: hospitals.get(hospitalSlug)._id, availability: makeAvailability(times), isDemo: true } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )
  }
  await Appointment.init()
}

async function listHospitals(search = '') {
  const criteria = search ? {
    $or: [
      { name: new RegExp(escapeRegex(search), 'i') },
      { location: new RegExp(escapeRegex(search), 'i') },
      { specialties: new RegExp(escapeRegex(search), 'i') },
    ],
  } : {}
  return Hospital.find(criteria).sort({ name: 1 })
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function listDoctors(hospitalId, specialty = '') {
  const criteria = { hospital: hospitalId }
  if (specialty) criteria.specialty = specialty
  return Doctor.find(criteria).populate('hospital', 'name address location').sort({ specialty: 1, name: 1 })
}

async function getAvailability(doctor, date) {
  const now = new Date()
  if (!date) {
    const booked = await Appointment.find({
      doctor: doctor._id,
      date: { $in: doctor.availability.map(day => day.date) },
      status: 'upcoming',
    }).select('date time')
    const occupied = new Map()
    for (const item of booked) {
      if (!occupied.has(item.date)) occupied.set(item.date, new Set())
      occupied.get(item.date).add(item.time)
    }
    const dates = doctor.availability.filter(day =>
      day.times.some(time => new Date(`${day.date}T${time}:00.000Z`) > now && !occupied.get(day.date)?.has(time)),
    ).map(day => day.date)
    return { dates }
  }
  const schedule = doctor.availability.find(day => day.date === date)
  if (!schedule) return { slots: [] }
  const booked = await Appointment.find({ doctor: doctor._id, date, status: 'upcoming' }).select('time')
  const occupied = new Set(booked.map(item => item.time))
  return { slots: schedule.times.filter(time => new Date(`${date}T${time}:00.000Z`) > now && !occupied.has(time)) }
}

module.exports = { initializeAppointmentCatalog, listHospitals, listDoctors, getAvailability }
