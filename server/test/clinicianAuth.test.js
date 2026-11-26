const { afterEach, describe, it } = require('node:test')
const assert = require('node:assert/strict')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const Clinician = require('../models/Clinician')
const controller = require('../controllers/clinicianController')
const { requireClinician } = require('../middleware/auth')

const originals = []
const originalJwtSecret = process.env.JWT_SECRET
const stub = (target, key, value) => {
  originals.push([target, key, target[key]])
  target[key] = value
}
const response = () => ({
  statusCode: 200,
  body: null,
  cookieValue: null,
  cookieOptions: null,
  status(code) { this.statusCode = code; return this },
  json(body) { this.body = body; return this },
  cookie(_name, value, options) { this.cookieValue = value; this.cookieOptions = options; return this },
  clearCookie() {},
})
const sampleClinician = async (verified = true) => ({
  _id: '64b64c3f4f4a7b2d8e3f1234',
  name: 'Dr Example',
  email: 'doctor@example.com',
  password: await bcrypt.hash('SecureClinicianPass123', 4),
  licenseNumber: 'LIC-1000',
  specialization: 'Emergency Medicine',
  hospital: 'MedLink Hospital',
  role: 'clinician',
  isVerified: verified,
  status: 'pending',
})

afterEach(() => {
  while (originals.length) {
    const [target, key, value] = originals.pop()
    target[key] = value
  }
  if (originalJwtSecret === undefined) delete process.env.JWT_SECRET
  else process.env.JWT_SECRET = originalJwtSecret
})

describe('clinician authentication', () => {
  it('registers clinicians without an approval state and hashes their password', async () => {
    process.env.JWT_SECRET = 'test-secret-with-more-than-thirty-two-characters'
    let created
    stub(Clinician, 'create', async data => {
      created = new Clinician({ ...data, _id: '64b64c3f4f4a7b2d8e3f1234' })
      await created.validate()
      return created
    })
    const res = response()
    await controller.register({ body: {
      name: ' Dr Example ',
      email: ' DOCTOR@example.com ',
      password: 'SecureClinicianPass123',
      licenseNumber: 'lic-1000',
      specialization: 'Emergency Medicine',
      hospital: 'MedLink Hospital',
      role: 'patient',
      isVerified: true,
    } }, res)

    assert.equal(res.statusCode, 201)
    assert.equal(created.role, 'clinician')
    assert.equal(created.isVerified, undefined)
    assert.match(res.body.message, /sign in/)
    assert.notEqual(created.password, 'SecureClinicianPass123')
    assert.equal(await bcrypt.compare('SecureClinicianPass123', created.password), true)
  })

  it('issues a session to a legacy pending clinician with isVerified false', async () => {
    process.env.JWT_SECRET = 'test-secret-with-more-than-thirty-two-characters'
    const clinician = await sampleClinician(false)
    stub(Clinician, 'findOne', () => ({ select: async () => clinician }))
    const res = response()
    await controller.login({ body: { email: clinician.email, password: 'SecureClinicianPass123' } }, res)
    const decoded = jwt.verify(res.cookieValue, process.env.JWT_SECRET)
    assert.equal(res.statusCode, 200)
    assert.equal(decoded.role, 'clinician')
    assert.equal(res.body.clinician.isVerified, undefined)
  })

  it('issues a role-scoped HttpOnly session to a clinician', async () => {
    process.env.JWT_SECRET = 'test-secret-with-more-than-thirty-two-characters'
    const clinician = await sampleClinician(true)
    stub(Clinician, 'findOne', () => ({ select: async () => clinician }))
    const res = response()
    await controller.login({ body: { email: clinician.email, password: 'SecureClinicianPass123' } }, res)
    const decoded = jwt.verify(res.cookieValue, process.env.JWT_SECRET)
    assert.equal(res.statusCode, 200)
    assert.equal(decoded.role, 'clinician')
    assert.equal(decoded.clinicianId, clinician._id)
    assert.equal(res.body.clinician.licenseNumber, clinician.licenseNumber)
    assert.equal(res.cookieOptions.httpOnly, true)
    assert.equal(res.cookieOptions.sameSite, 'lax')
  })

  it('rejects a patient cookie before looking up any clinician', async () => {
    process.env.JWT_SECRET = 'test-secret-with-more-than-thirty-two-characters'
    const token = jwt.sign({ role: 'Patient', id: '64b64c3f4f4a7b2d8e3f1234' }, process.env.JWT_SECRET)
    const res = response()
    await requireClinician({ cookies: { token } }, res, () => {
      assert.fail('Patient sessions must not enter clinician routes')
    })
    assert.equal(res.statusCode, 403)
    assert.equal(res.body.code, 'INVALID_ROLE')
  })

  it('accepts a Doctor role on the shared token cookie', async () => {
    process.env.JWT_SECRET = 'test-secret-with-more-than-thirty-two-characters'
    const clinician = await sampleClinician()
    stub(Clinician, 'findById', async () => clinician)
    const token = jwt.sign({ role: 'Doctor', clinicianId: clinician._id }, process.env.JWT_SECRET)
    const req = { cookies: { token } }
    let nextCalled = false

    await requireClinician(req, response(), () => { nextCalled = true })

    assert.equal(nextCalled, true)
    assert.equal(req.user.role, 'Doctor')
    assert.equal(req.user.clinicianId, clinician._id)
  })

  it('rejects a Patient role on the shared token cookie', async () => {
    process.env.JWT_SECRET = 'test-secret-with-more-than-thirty-two-characters'
    const token = jwt.sign({ role: 'Patient', id: '64b64c3f4f4a7b2d8e3f1234' }, process.env.JWT_SECRET)
    const res = response()
    await requireClinician({ cookies: { token } }, res, () => {
      assert.fail('Patient role cannot enter Doctor routes')
    })
    assert.equal(res.statusCode, 403)
    assert.equal(res.body.code, 'INVALID_ROLE')
  })

  it('allows a legacy pending clinician through the authenticated route guard', async () => {
    process.env.JWT_SECRET = 'test-secret-with-more-than-thirty-two-characters'
    const clinician = await sampleClinician(false)
    stub(Clinician, 'findById', async () => clinician)
    const token = jwt.sign({ role: 'clinician', clinicianId: clinician._id }, process.env.JWT_SECRET)
    const req = { cookies: { clinician_token: token } }
    let nextCalled = false
    await requireClinician(req, response(), () => { nextCalled = true })
    assert.equal(nextCalled, true)
    assert.equal(req.user.role, 'clinician')
    assert.equal(req.user.isVerified, undefined)
  })

  it('rejects a clinician token when its clinician record no longer exists', async () => {
    process.env.JWT_SECRET = 'test-secret-with-more-than-thirty-two-characters'
    stub(Clinician, 'findById', async () => null)
    const token = jwt.sign({ role: 'clinician', clinicianId: '64b64c3f4f4a7b2d8e3f1234' }, process.env.JWT_SECRET)
    const res = response()
    await requireClinician({ cookies: { clinician_token: token } }, res, () => {
      assert.fail('Deleted clinician accounts must not pass middleware')
    })
    assert.equal(res.statusCode, 403)
    assert.equal(res.body.code, 'CLINICIAN_NOT_FOUND')
  })

  it('adds a stable clinician id and emergency permissions', async () => {
    process.env.JWT_SECRET = 'test-secret-with-more-than-thirty-two-characters'
    const clinician = await sampleClinician(true)
    stub(Clinician, 'findById', async () => clinician)
    const token = jwt.sign({ role: 'clinician', clinicianId: clinician._id }, process.env.JWT_SECRET)
    const req = { cookies: { clinician_token: token } }
    let nextCalled = false
    await requireClinician(req, response(), () => { nextCalled = true })
    assert.equal(nextCalled, true)
    assert.equal(req.user.clinicianId, clinician._id)
    assert.equal(req.user.role, 'clinician')
    assert.ok(req.user.permissions.includes('emergency:read'))
  })
})
