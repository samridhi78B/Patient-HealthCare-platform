const { afterEach, describe, it } = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const mongoose = require('mongoose')
const User = require('../models/User')
const MedicalReport = require('../models/MedicalReport')
const MedicalHistoryItem = require('../models/MedicalHistoryItem')
const EmergencyAccessSession = require('../models/EmergencyAccessSession')
const AuditLog = require('../models/AuditLog')
const controller = require('../controllers/emergencyController')
const { findActiveSession, hashToken, randomToken, getQrForPatient, revokeQr, emergencySummary } = require('../services/emergencyService')
const { logClinicianAction } = require('../services/auditService')

const originals = []
const originalJwtSecret = process.env.JWT_SECRET
const originalClientUrl = process.env.CLIENT_URL
const stub = (target, key, value) => {
  originals.push([target, key, target[key]])
  target[key] = value
}
const request = body => ({
  body,
  ip: '127.0.0.1',
  user: {
    clinicianId: '64b64c3f4f4a7b2d8e3f1234',
    licenseNumber: 'LIC-1000',
    permissions: ['emergency:read', 'history:verify', 'history:write'],
  },
  get: name => name === 'user-agent' ? 'test-agent' : undefined,
})
const response = () => ({
  statusCode: 200,
  body: null,
  headers: {},
  status(code) { this.statusCode = code; return this },
  set(name, value) { this.headers[name] = value; return this },
  json(body) { this.body = body; return this },
})
const emptyHistoryQuery = () => ({
  select() { return this },
  sort() { return this },
  limit() { return this },
  populate() { return this },
  then(resolve, reject) { return Promise.resolve([]).then(resolve, reject) },
})
const resultQuery = result => ({
  sort() { return this },
  limit() { return this },
  populate() { return this },
  select() { return this },
  then(resolve, reject) { return Promise.resolve(result).then(resolve, reject) },
})

afterEach(() => {
  while (originals.length) {
    const [target, key, value] = originals.pop()
    target[key] = value
  }
  if (originalJwtSecret === undefined) delete process.env.JWT_SECRET
  else process.env.JWT_SECRET = originalJwtSecret
  if (originalClientUrl === undefined) delete process.env.CLIENT_URL
  else process.env.CLIENT_URL = originalClientUrl
})

describe('emergency access security', () => {
  it('creates a short-lived access grant and audit event for a valid QR', async () => {
    const token = randomToken()
    const patient = new User({
      _id: '64b64c3f4f4a7b2d8e3f9999',
      name: 'Patient Example',
      email: 'patient@example.com',
      phone: '+12345678901',
      password: 'not-used',
    })
    let foundQuery
    let sessionRecord
    let auditRecord
    stub(User, 'findOne', async query => { foundQuery = query; return patient })
    stub(MedicalHistoryItem, 'find', emptyHistoryQuery)
    stub(MedicalReport, 'find', emptyHistoryQuery)
    stub(EmergencyAccessSession, 'create', async data => { sessionRecord = data; return data })
    stub(AuditLog, 'create', async data => { auditRecord = data; return data })

    const res = response()
    await controller.open(request({ qrToken: token, reason: 'Unconscious patient in emergency department' }), res)

    assert.equal(foundQuery.emergencyQrTokenHash, hashToken(token))
    assert.ok(foundQuery.emergencyQrExpiresAt.$gt instanceof Date)
    assert.equal(sessionRecord.patientId.toString(), patient._id.toString())
    assert.equal(sessionRecord.clinicianId, '64b64c3f4f4a7b2d8e3f1234')
    assert.equal(sessionRecord.readOnly, true)
    assert.ok(sessionRecord.expiresAt > new Date())
    assert.equal(auditRecord.action, 'SUMMARY_VIEW')
    assert.equal(auditRecord.clinicianId, '64b64c3f4f4a7b2d8e3f1234')
    assert.equal(auditRecord.clinicianLicenseNumber, 'LIC-1000')
    assert.equal(auditRecord.patientId.toString(), patient._id.toString())
    assert.equal(auditRecord.ip, '127.0.0.1')
    assert.equal(auditRecord.userAgent, 'test-agent')
    assert.match(auditRecord.reason, /Unconscious patient/)
    assert.equal(res.body.summary.patient.name, 'Patient Example')
    assert.equal(res.body.summary.history, undefined)
    assert.equal(res.body.summary.patient.dateOfBirth, undefined)
    assert.deepEqual(res.body.summary.medicalReports, [])
    assert.equal(res.headers['Cache-Control'], 'private, no-store')
  })

  it('blocks reads and writes beyond the summary for a QR emergency session', async () => {
    const req = {
      ...request({ type: 'observation', title: 'Test record' }),
      emergencyAccess: { readOnly: true },
      params: { itemId: '64b64c3f4f4a7b2d8e3f9999', reportId: '64b64c3f4f4a7b2d8e3f9999' },
    }
    const readOnlyError = error => error.status === 403 && error.code === 'READ_ONLY_SESSION'
    await assert.rejects(controller.records(req, response()), readOnlyError)
    await assert.rejects(controller.downloadReport(req, response()), readOnlyError)
    await assert.rejects(controller.verifyHistoryItem(req, response()), readOnlyError)
    await assert.rejects(controller.addHistoryItem(req, response()), readOnlyError)
    await assert.rejects(controller.records({ ...req, emergencyAccess: {} }, response()), readOnlyError)
  })

  it('returns no patient data for revoked or expired QR tokens', async () => {
    const token = crypto.randomBytes(32).toString('base64url')
    let searched = false
    stub(User, 'findOne', async () => { searched = true; return null })
    const res = response()
    await assert.rejects(
      controller.open(request({ qrToken: token, reason: 'Emergency assessment' }), res),
      error => error.status === 404,
    )
    assert.equal(searched, true)
    assert.equal(res.body, null)
  })

  it('rejects an expired credential even when its hash still exists', async () => {
    const token = randomToken()
    const expiredAt = new Date(Date.now() - 1000)
    let filter
    stub(User, 'findOne', async query => {
      filter = query
      return expiredAt > query.emergencyQrExpiresAt.$gt ? { _id: '64b64c3f4f4a7b2d8e3f9999' } : null
    })
    await assert.rejects(
      controller.open(request({ qrToken: token, reason: 'Emergency assessment' }), response()),
      error => error.status === 404,
    )
    assert.equal(filter.emergencyQrTokenHash, hashToken(token))
    assert.ok(filter.emergencyQrExpiresAt.$gt > expiredAt)
  })

  it('rejects a request without the authenticated clinician id before looking up a patient', async () => {
    let queried = false
    stub(User, 'findOne', async () => { queried = true; return null })
    await assert.rejects(
      controller.open({ ...request({ qrToken: randomToken(), reason: 'Emergency' }), user: {} }, response()),
      error => error.status === 403 && error.code === 'INVALID_ROLE',
    )
    assert.equal(queried, false)
  })

  it('does not allow a different clinician to reuse an emergency session', async () => {
    let filter
    stub(EmergencyAccessSession, 'findOne', query => {
      filter = query
      return { select: async () => null }
    })
    await assert.rejects(findActiveSession(randomToken(), '64b64c3f4f4a7b2d8e3f1234'), error => error.status === 403)
    assert.equal(filter.clinicianId, '64b64c3f4f4a7b2d8e3f1234')
    assert.equal(filter.revokedAt, null)
    assert.ok(filter.expiresAt.$gt instanceof Date)
  })

  it('requires an authenticated clinician identity before creating audit records', async () => {
    let wroteLog = false
    stub(AuditLog, 'create', async () => { wroteLog = true })
    await assert.rejects(
      logClinicianAction({ user: {}, get: () => '', ip: '' }, new mongoose.Types.ObjectId(), 'SUMMARY_VIEW'),
      error => error.status === 403,
    )
    assert.equal(wroteLog, false)
  })

  it('creates a private QR token, keeps it stable, then revokes it and active sessions', async () => {
    process.env.JWT_SECRET = 'test-secret-with-more-than-thirty-two-characters'
    process.env.CLIENT_URL = 'http://localhost:5173'
    const patient = new User({
      _id: '64b64c3f4f4a7b2d8e3f9999',
      name: 'Patient Example',
      email: 'patient@example.com',
      phone: '+12345678901',
      password: 'not-used',
    })
    patient.save = async () => patient
    const actions = []
    let sessionUpdates = 0
    stub(EmergencyAccessSession, 'updateMany', async () => { sessionUpdates += 1 })
    stub(AuditLog, 'create', async data => { actions.push(data.action); return data })

    const first = await getQrForPatient(patient, request({}))
    const second = await getQrForPatient(patient, request({}))
    assert.match(first.qrCodeDataUrl, /^data:image\/png;base64,/)
    assert.equal(first.qrCodeDataUrl, second.qrCodeDataUrl)
    assert.equal(patient.emergencyQrTokenHash.length, 64)
    assert.equal(patient.emergencyQrTokenEncrypted.includes(patient.emergencyQrTokenHash), false)
    assert.ok(first.expiresAt > new Date())

    await revokeQr(patient, request({}))
    assert.equal(patient.emergencyQrTokenHash, null)
    assert.deepEqual(actions, ['QR_ISSUE', 'QR_REVOKE'])
    assert.equal(sessionUpdates, 2)
  })

  it('keeps patient-entered test results separate from report-derived observations', async () => {
    const patient = new User({
      _id: '64b64c3f4f4a7b2d8e3f9999',
      name: 'Patient Example',
      email: 'patient@example.com',
      phone: '+12345678901',
      password: 'not-used',
    })
    const aiFinding = {
      _id: new mongoose.Types.ObjectId(),
      type: 'reported-diagnosis',
      title: 'Reported condition',
      source: 'report-extracted',
      verificationStatus: 'unreviewed',
      report: null,
    }
    stub(MedicalHistoryItem, 'find', () => resultQuery([aiFinding]))
    stub(MedicalReport, 'find', () => resultQuery([{
      _id: new mongoose.Types.ObjectId(),
      title: 'Blood test',
      category: 'Blood Test',
      createdAt: new Date('2025-01-03T00:00:00.000Z'),
      originalName: 'blood.pdf',
      testResults: [{ _id: new mongoose.Types.ObjectId(), testName: 'Hemoglobin', value: 12.1, unit: 'g/dL', testDate: new Date('2025-01-02') }],
    }]))

    const summary = await emergencySummary(patient)
    const extracted = summary.history.find(item => item.source === 'report-extracted')
    const entered = summary.history.find(item => item.source === 'patient-entered')
    assert.equal(extracted.type, 'reported-diagnosis')
    assert.equal(extracted.verificationStatus, 'unreviewed')
    assert.equal(entered.title, 'Hemoglobin')
    assert.equal(entered.value, '12.1')
    assert.equal(entered.verificationStatus, 'unreviewed')
    assert.deepEqual(summary.medicalReports, [{
      title: 'Blood test',
      category: 'Blood Test',
      createdAt: new Date('2025-01-03T00:00:00.000Z'),
    }])
  })

  it('returns only report names and dates in a QR emergency summary', async () => {
    const patient = new User({
      _id: '64b64c3f4f4a7b2d8e3f9999',
      name: 'Patient Example',
      email: 'patient@example.com',
      phone: '+12345678901',
      password: 'not-used',
    })
    const createdAt = new Date('2025-01-03T00:00:00.000Z')
    stub(MedicalReport, 'find', () => resultQuery([{
      title: 'Blood test',
      category: 'Blood Test',
      createdAt,
      aiSummary: { overview: 'This must not be returned.' },
    }]))

    const summary = await emergencySummary(patient, { readOnly: true })
    assert.deepEqual(summary.medicalReports, [{ title: 'Blood test', createdAt }])
    assert.deepEqual(Object.keys(summary.patient), ['name'])
  })
})
