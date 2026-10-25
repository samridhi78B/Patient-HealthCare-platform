const fs = require('fs')
const fsp = require('fs/promises')
const path = require('path')
const mongoose = require('mongoose')
const MedicalReport = require('../models/MedicalReport')
const { STORAGE_DIR } = require('../middleware/upload')
const { CATEGORIES } = MedicalReport
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const httpErr = (status, message) => Object.assign(new Error(message), { status })
const filePath = r => path.join(STORAGE_DIR, path.basename(r.storedName))

// Every lookup is scoped by owner, so another patient's id behaves exactly like a missing id (404).
async function findOwned(req) {
  if (!mongoose.isValidObjectId(req.params.id)) throw httpErr(404, 'Report not found')
  const r = await MedicalReport.findOne({ _id: req.params.id, owner: req.user._id })
  if (!r) throw httpErr(404, 'Report not found')
  return r
}
exports.list = async (req, res) => {
  const { search = '', category = '', sort = 'newest' } = req.query
  const q = { owner: req.user._id }
  if (search) { const re = new RegExp(esc(String(search)), 'i'); q.$or = [{ title: re }, { originalName: re }] }
  if (CATEGORIES.includes(category)) q.category = category
  res.json({ reports: await MedicalReport.find(q).sort({ createdAt: sort === 'oldest' ? 1 : -1 }) })
}
exports.summary = async (req, res) => {
  const owner = req.user._id
  const since = new Date(Date.now() - 30 * 864e5)
  const [total, recent, recentCount, cats] = await Promise.all([
    MedicalReport.countDocuments({ owner }),
    MedicalReport.find({ owner }).sort({ createdAt: -1 }).limit(3),
    MedicalReport.countDocuments({ owner, createdAt: { $gte: since } }),
    MedicalReport.aggregate([{ $match: { owner } }, { $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
  ])
  res.json({ total, recent, recentCount, categories: cats.map(c => ({ category: c._id, count: c.count })) })
}
exports.upload = async (req, res) => {
  if (!req.file) throw httpErr(400, 'No file received. Attach a PDF, JPG or PNG.')
  const category = CATEGORIES.includes(req.body.category) ? req.body.category : 'General'
  const title = (req.body.title || '').trim().slice(0, 160) || req.file.originalname.slice(0, 160)
  try {
    const report = await MedicalReport.create({ owner: req.user._id, title, category, originalName: req.file.originalname.slice(0, 200),
      storedName: req.file.filename, mimeType: req.file.detectedMime, size: req.file.size })
    res.status(201).json({ message: 'Report uploaded successfully', report })
  } catch (e) { await fsp.unlink(req.file.path).catch(() => {}); throw e }
}
exports.getOne = async (req, res) => res.json({ report: await findOwned(req) })
exports.download = async (req, res) => {
  const r = await findOwned(req)
  if (!fs.existsSync(filePath(r))) throw httpErr(410, 'The stored file is missing')
  const inline = req.query.disposition === 'inline'
  res.setHeader('Content-Type', r.mimeType)
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Cache-Control', 'private, no-store')
  res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="report"; filename*=UTF-8''${encodeURIComponent(r.originalName)}`)
  fs.createReadStream(filePath(r)).pipe(res)
}
exports.remove = async (req, res) => {
  const r = await findOwned(req)
  await r.deleteOne()
  await fsp.unlink(filePath(r)).catch(() => {})
  res.json({ message: 'Report deleted' })
}
