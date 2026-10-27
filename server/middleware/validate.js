const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const strong = p => typeof p === 'string' && p.length >= 8 && /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p)
const bad = (res, message) => res.status(400).json({ message })
exports.validateRegister = (req, res, next) => {
  const { name, email, phone, password } = req.body
  if (typeof name !== 'string' || name.trim().length < 2) return bad(res, 'Full name must be at least 2 characters')
  if (typeof email !== 'string' || !EMAIL.test(email.trim())) return bad(res, 'Enter a valid email address')
  if (typeof phone !== 'string' || !/^\+?[\d\s-]{10,15}$/.test(phone)) return bad(res, 'Enter a valid phone number (10-15 digits)')
  if (!strong(password)) return bad(res, 'Password needs 8+ characters with upper-case, lower-case and a number')
  next()
}
exports.validateLogin = (req, res, next) => {
  const { email, password } = req.body
  if (typeof email !== 'string' || !EMAIL.test(email.trim()) || typeof password !== 'string' || !password) return bad(res, 'Email and password are required')
  next()
}
