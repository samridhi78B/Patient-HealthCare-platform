const mongoose = require('mongoose')
const MedicalHistoryItem = require('../models/MedicalHistoryItem')

const httpErr = (status, message) => Object.assign(new Error(message), { status })

exports.listMine = async (req, res) => {
  const items = await MedicalHistoryItem.find({ owner: req.user._id })
    .select('-owner -sourceKey')
    .sort({ observedAt: -1, createdAt: -1 })
    .populate('report', 'title originalName category createdAt')
  res.json({ items })
}

exports.review = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw httpErr(404, 'Medical history item not found')
  const item = await MedicalHistoryItem.findOneAndUpdate(
    { _id: req.params.id, owner: req.user._id, source: 'report-extracted', verificationStatus: 'unreviewed' },
    { $set: { verificationStatus: 'patient-reviewed' } },
    { new: true },
  )
  if (!item) throw httpErr(404, 'Unreviewed report finding not found')
  res.json({ message: 'Finding marked as reviewed by the patient', item })
}
