const multer = require('multer')
const path = require('path')
const fs = require('fs')
const fsp = require('fs/promises')
const crypto = require('crypto')
const STORAGE_DIR = path.join(__dirname, '..', 'storage') // not served by any static route
const ALLOWED = { '.pdf': ['application/pdf'], '.jpg': ['image/jpeg'], '.jpeg': ['image/jpeg'], '.png': ['image/png'] }
const storage = multer.diskStorage({
  destination: (_r, _f, cb) => { fs.mkdirSync(STORAGE_DIR, { recursive: true }); cb(null, STORAGE_DIR) },
  // Random server-generated name; the client's filename is never used on disk.
  filename: (_r, file, cb) => cb(null, crypto.randomUUID() + path.extname(file.originalname).toLowerCase()),
})
const multerUpload = multer({
  storage, limits: { fileSize: Number(process.env.MAX_FILE_SIZE_MB || 10) * 1024 * 1024, files: 1 },
  fileFilter: (_r, file, cb) => {
    const ok = (ALLOWED[path.extname(file.originalname).toLowerCase()] || []).includes(file.mimetype)
    cb(ok ? null : Object.assign(new Error('Only PDF, JPG, JPEG and PNG files are allowed'), { status: 415 }), ok)
  },
}).single('file')
// Header MIME/extension can be spoofed, so confirm the real file signature after saving.
function detect(b) {
  if (b.slice(0, 5).toString() === '%PDF-') return 'application/pdf'
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png'
  return null
}
const upload = (req, res, next) => multerUpload(req, res, async err => {
  if (err) return next(err)
  if (!req.file) return next()
  try {
    const fh = await fsp.open(req.file.path, 'r'); const buf = Buffer.alloc(8); await fh.read(buf, 0, 8, 0); await fh.close()
    const real = detect(buf)
    if (!real || real !== req.file.mimetype) {
      await fsp.unlink(req.file.path).catch(() => {})
      return next(Object.assign(new Error('File content does not match its type. Upload rejected.'), { status: 415 }))
    }
    req.file.detectedMime = real
    next()
  } catch (e) { next(e) }
})
module.exports = { upload, STORAGE_DIR }
