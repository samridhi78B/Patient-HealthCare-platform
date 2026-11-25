require('dotenv').config()
const connectDB = require('../config/db')
const Clinician = require('../models/Clinician')

async function main() {
  const email = process.argv[2]
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Usage: npm run clinician:verify -- clinician@example.com')
  }

  await connectDB()
  const clinician = await Clinician.findOneAndUpdate(
    { email: email.trim().toLowerCase() },
    { $set: { isVerified: true } },
    { new: true },
  )
  if (!clinician) throw new Error('No clinician with that email was found')
  console.log(`Verified clinician account: ${clinician.email}`)
}

main()
  .catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
  .finally(async () => {
    const mongoose = require('mongoose')
    if (mongoose.connection.readyState) await mongoose.disconnect()
  })
