const mongoose = require('mongoose')
module.exports = async function connectDB() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set. Copy server/.env.example to server/.env')
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 })
  console.log('MongoDB connected')
}
