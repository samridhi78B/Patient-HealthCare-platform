const jwt = require('jsonwebtoken')
const User = require('../models/User')
exports.protect = async (req, res, next) => {
  try {
    const token = req.cookies.token
    if (!token) return res.status(401).json({ message: 'Authentication required' })
    const { id } = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(id)
    if (!user) return res.status(401).json({ message: 'Account no longer exists' })
    req.user = user
    next()
  } catch { res.status(401).json({ message: 'Session expired or invalid. Please log in again.' }) }
}
// CSRF defence: cookies are SameSite=Lax, CORS is limited to CLIENT_URL, and every state-changing
// request must carry a custom header that cross-site forms cannot send (and that triggers a CORS preflight).
exports.csrfGuard = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
  if (req.get('X-Requested-With') !== 'XMLHttpRequest') return res.status(403).json({ message: 'Missing CSRF header' })
  next()
}
