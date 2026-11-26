const { afterEach, describe, it } = require('node:test')
const assert = require('node:assert/strict')
const Appointment = require('../models/Appointment')
const AuditLog = require('../models/AuditLog')
const Clinician = require('../models/Clinician')
const DoctorNote = require('../models/DoctorNote')
const User = require('../models/User')
const controller = require('../controllers/doctorController')

const originals = []
const clinicianId = '64b64c3f4f4a7b2d8e3f1234'
const patientId = '64b64c3f4f4a7b2d8e3f5678'
const clinician = { _id: clinicianId, providerDoctorIds: ['64b64c3f4f4a7b2d8e3f1111'] }
const request = body => ({
  body,
  params: { patientId },
  ip: '127.0.0.1',
  user: { clinicianId, licenseNumber: 'LIC-1000' },
  get: name => name === 'user-agent' ? 'test-agent' : '',
})
const response = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this },
  json(body) { this.body = body; return this },
})
const stub = (target, key, value) => {
  originals.push([target, key, target[key]])
  target[key] = value
}

afterEach(() => {
  while (originals.length) {
    const [target, key, value] = originals.pop()
    target[key] = value
  }
})

describe('doctor patient records', () => {
  it('does not fetch an unrelated patient profile', async () => {
    let profileRead = false
    stub(Clinician, 'findById', async () => clinician)
    stub(Appointment, 'exists', async () => false)
    stub(User, 'findById', async () => { profileRead = true })

    await assert.rejects(
      controller.patientProfile(request({}), response()),
      error => error.status === 404,
    )
    assert.equal(profileRead, false)
  })

  it('saves doctor notes only after confirming the patient is in the clinician practice', async () => {
    let savedNote
    let auditRecord
    stub(Clinician, 'findById', async () => clinician)
    stub(Appointment, 'exists', async query => query.patient === patientId)
    stub(DoctorNote, 'create', async data => {
      savedNote = data
      return { ...data, _id: '64b64c3f4f4a7b2d8e3f9999', populate: async () => {} }
    })
    stub(AuditLog, 'create', async data => { auditRecord = data })
    const res = response()

    await controller.addNote(request({ note: 'Follow up in two weeks', prescription: 'Take medicine after meals' }), res)

    assert.equal(res.statusCode, 201)
    assert.equal(savedNote.patientId, patientId)
    assert.equal(savedNote.clinicianId, clinicianId)
    assert.equal(savedNote.note, 'Follow up in two weeks')
    assert.equal(savedNote.prescription, 'Take medicine after meals')
    assert.equal(auditRecord.action, 'DOCTOR_NOTE_CREATE')
    assert.equal(auditRecord.patientId, patientId)
  })
})
