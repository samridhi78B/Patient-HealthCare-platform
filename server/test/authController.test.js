const { afterEach, describe, it } = require('node:test')
const assert = require('node:assert/strict')
const bcrypt = require('bcryptjs')
const crypto = require('node:crypto')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const Clinician = require('../models/Clinician')
const controller = require('../controllers/authController')
const validation = require('../middleware/validate')
const { authenticate } = require('../middleware/authMiddleware')

const originals = []
const originalJwtSecret = process.env.JWT_SECRET
const stub = (target, key, value) => {
  originals.push([target, key, target[key]])
  target[key] = value
}
const response = () => ({
  statusCode: 200,
  body: null,
  cookieSet: false,
  cookieName: null,
  cookieValue: null,
  status(code) { this.statusCode = code; return this },
  cookie(name, value) { this.cookieSet = true; this.cookieName = name; this.cookieValue = value; return this },
  json(body) { this.body = body; return this },
})
const mockUserStore = initialUsers => {
  const users = initialUsers
  stub(User, 'findOne', filter => {
    const found = users.find(user => user.email === filter.email) || null
    return {
      select() { return this },
      then(resolve, reject) { return Promise.resolve(found).then(resolve, reject) },
    }
  })
  stub(User, 'create', async data => {
    const user = new User(data)
    await user.validate()
    users.push(user)
    return user
  })
  stub(Clinician, 'findOne', () => ({
    select() { return this },
    then(resolve, reject) { return Promise.resolve(null).then(resolve, reject) },
  }))
  return users
}

afterEach(() => {
  while (originals.length) {
    const [target, key, value] = originals.pop()
    target[key] = value
  }
  if (originalJwtSecret === undefined) delete process.env.JWT_SECRET
  else process.env.JWT_SECRET = originalJwtSecret
})

describe('authentication controller', () => {
  it('registers and logs in with the same password despite email case and surrounding whitespace', async () => {
    process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex')
    const users = mockUserStore([])
    const registered = response()
    await controller.register({
      body: { name: 'Test Patient', email: '  Patient@Example.com  ', phone: '+12345678901', password: 'SecurePass123' },
    }, registered)

    assert.equal(registered.statusCode, 201)
    assert.equal(users.length, 1)
    assert.equal(users[0].email, 'patient@example.com')
    assert.notEqual(users[0].password, 'SecurePass123')
    assert.equal(await bcrypt.compare('SecurePass123', users[0].password), true)

    const loggedIn = response()
    await controller.login({
      body: { email: ' PATIENT@example.COM ', password: 'SecurePass123', remember: false },
    }, loggedIn)
    assert.equal(loggedIn.statusCode, 200)
    assert.equal(loggedIn.cookieSet, true)
    assert.equal(loggedIn.cookieName, 'token')
    assert.equal(jwt.verify(loggedIn.cookieValue, process.env.JWT_SECRET).role, 'Patient')
    assert.equal(loggedIn.body.user.email, 'patient@example.com')
    assert.equal(loggedIn.body.user.role, 'Patient')
  })

  it('authenticates a doctor through the same login endpoint and shared session cookie', async () => {
    process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex')
    mockUserStore([])
    const doctor = {
      _id: '64b64c3f4f4a7b2d8e3f1234',
      name: 'Dr Example',
      email: 'doctor@example.com',
      phone: '',
      password: await bcrypt.hash('SecureDoctorPass123', 4),
      licenseNumber: 'LIC-1000',
      specialization: 'Cardiology',
      hospital: 'MedLink Hospital',
    }
    stub(Clinician, 'findOne', () => ({
      select() { return this },
      then(resolve, reject) { return Promise.resolve(doctor).then(resolve, reject) },
    }))
    const res = response()

    await controller.login({ body: { email: doctor.email, password: 'SecureDoctorPass123' } }, res)

    assert.equal(res.statusCode, 200)
    assert.equal(res.cookieName, 'token')
    assert.equal(jwt.verify(res.cookieValue, process.env.JWT_SECRET).role, 'Doctor')
    assert.equal(res.body.user.role, 'Doctor')
    assert.equal(res.body.user.licenseNumber, doctor.licenseNumber)
  })

  it('resolves a Doctor user from the shared session for the common auth check', async () => {
    process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex')
    const doctor = {
      _id: '64b64c3f4f4a7b2d8e3f1234',
      name: 'Dr Example',
      email: 'doctor@example.com',
      toJSON: () => ({ _id: '64b64c3f4f4a7b2d8e3f1234', name: 'Dr Example', email: 'doctor@example.com' }),
    }
    stub(Clinician, 'findById', async () => doctor)
    const token = jwt.sign({ role: 'Doctor', clinicianId: doctor._id }, process.env.JWT_SECRET)
    const req = { cookies: { token } }
    let nextCalled = false

    await authenticate(req, response(), () => { nextCalled = true })

    assert.equal(nextCalled, true)
    assert.equal(req.user.role, 'Doctor')
    assert.equal(req.user.id, doctor._id)
  })

  it('keeps wrong-password responses generic and does not issue a session', async () => {
    process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex')
    const passwordHash = await bcrypt.hash('SecurePass123', 4)
    const storedUser = new User({
      name: 'Existing Patient',
      email: 'existing@example.com',
      phone: '+12345678901',
      password: passwordHash,
    })
    mockUserStore([storedUser])
    const correctPassword = response()
    await controller.login({
      body: { email: 'existing@example.com', password: 'SecurePass123', remember: false },
    }, correctPassword)
    assert.equal(correctPassword.statusCode, 200)
    assert.equal(correctPassword.cookieSet, true)
    assert.equal(storedUser.password, passwordHash)

    const res = response()
    await controller.login({
      body: { email: 'existing@example.com', password: 'WrongPass123', remember: false },
    }, res)

    assert.equal(res.statusCode, 401)
    assert.deepEqual(res.body, { message: 'Invalid email or password' })
    assert.equal(res.cookieSet, false)
  })

  it('accepts whitespace around a valid email before the controller normalizes it', () => {
    let registerPassed = false
    validation.validateRegister({
      body: { name: 'Test Patient', email: ' patient@example.com ', phone: '+12345678901', password: 'SecurePass123' },
    }, response(), () => { registerPassed = true })
    assert.equal(registerPassed, true)

    let loginPassed = false
    validation.validateLogin({
      body: { email: ' patient@example.com ', password: 'SecurePass123' },
    }, response(), () => { loginPassed = true })
    assert.equal(loginPassed, true)
  })
})
