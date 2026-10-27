const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const publicUser = u => ({ id: u._id, name: u.name, email: u.email, phone: u.phone, createdAt: u.createdAt })
const cookieOpts = remember => ({
  httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/',
  ...(remember ? { maxAge: Number(process.env.REMEMBER_ME_DAYS || 14) * 864e5 } : {}),
})
const issue = (res, user, remember) => {
  const expiresIn = remember ? `${process.env.REMEMBER_ME_DAYS || 14}d` : process.env.JWT_EXPIRES_IN || '2h'
  res.cookie('token', jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn }), cookieOpts(remember))
}
exports.register = async (req, res) => {
  const { name, email, phone, password } = req.body
  const normalizedEmail = email.trim().toLowerCase()
  if (await User.findOne({ email: normalizedEmail })) return res.status(409).json({ message: 'An account with this email already exists' })
  const user = await User.create({ name, email: normalizedEmail, phone, password: await bcrypt.hash(password, 12) })
  res.status(201).json({ message: 'Account created. You can now log in.', user: publicUser(user) })
}
exports.login = async (req, res) => {
  const { email, password, remember } = req.body
  const normalizedEmail = email.trim().toLowerCase()
  const user = await User.findOne({ email: normalizedEmail }).select('+password')
  // Same message for unknown email and wrong password to avoid account enumeration.
  if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: 'Invalid email or password' })
  issue(res, user, !!remember)
  res.json({ user: publicUser(user) })
}
exports.logout = (req, res) => { res.clearCookie('token', cookieOpts(false)); res.json({ message: 'Logged out' }) }
exports.me = (req, res) => res.json({ user: publicUser(req.user) })
