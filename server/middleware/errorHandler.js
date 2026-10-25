exports.notFound = (req, res) => res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` })
exports.errorHandler = (err, req, res, _next) => {
  if (err.name === 'MulterError') {
    const big = err.code === 'LIMIT_FILE_SIZE'
    return res.status(big ? 413 : 400).json({ message: big ? `File too large. Maximum is ${process.env.MAX_FILE_SIZE_MB || 10} MB.` : err.message })
  }
  if (err.name === 'ValidationError') return res.status(400).json({ message: Object.values(err.errors)[0].message })
  if (err.code === 11000) return res.status(409).json({ message: 'That value is already in use' })
  const status = err.status || 500
  if (status === 500) console.error(err)
  res.status(status).json({ message: status === 500 ? 'Something went wrong on the server' : err.message })
}
