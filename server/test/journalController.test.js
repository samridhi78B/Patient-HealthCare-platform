const { afterEach, describe, it } = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const Appointment = require('../models/Appointment')
const SymptomEntry = require('../models/SymptomEntry')
const User = require('../models/User')
const controller = require('../controllers/journalController')

const originals = []
const stub = (target, key, value) => {
  originals.push([target, key, target[key]])
  target[key] = value
}
const response = () => ({
  statusCode: 200,
  body: null,
  headers: {},
  status(code) { this.statusCode = code; return this },
  json(body) { this.body = body; return this },
  setHeader(name, value) { this.headers[name] = value },
})
const query = value => ({
  sort() { return this },
  populate() { return this },
  select() { return this },
  lean() { return Promise.resolve(value) },
  then(resolve, reject) { return Promise.resolve(value).then(resolve, reject) },
})

afterEach(() => {
  while (originals.length) {
    const [target, key, value] = originals.pop()
    target[key] = value
  }
})

describe('patient symptom journal API controller', () => {
  it('creates entries with the authenticated owner and a verified patient appointment', async () => {
    const owner = new mongoose.Types.ObjectId()
    const appointmentId = new mongoose.Types.ObjectId()
    let saved
    let appointmentFilter
    stub(Appointment, 'findOne', filter => {
      appointmentFilter = filter
      return { select: async () => ({ _id: appointmentId }) }
    })
    stub(SymptomEntry, 'create', async document => {
      saved = document
      return { ...document, _id: new mongoose.Types.ObjectId(), populate: async function () { return this } }
    })
    const res = response()
    await controller.create({
      user: { _id: owner },
      body: {
        symptom: 'Headache',
        category: 'pain',
        severity: 6,
        occurredAt: '2026-10-25T12:30:00.000Z',
        appointmentId: String(appointmentId),
      },
    }, res)
    assert.equal(res.statusCode, 201)
    assert.equal(String(saved.owner), String(owner))
    assert.equal(String(saved.appointment), String(appointmentId))
    assert.deepEqual(appointmentFilter, { _id: String(appointmentId), patient: owner })
  })

  it('rejects an appointment belonging to a different patient', async () => {
    const owner = new mongoose.Types.ObjectId()
    let createCalled = false
    stub(Appointment, 'findOne', () => ({ select: async () => null }))
    stub(SymptomEntry, 'create', async () => { createCalled = true })
    await assert.rejects(
      controller.create({
        user: { _id: owner },
        body: { symptom: 'Cough', category: 'respiratory', severity: 4, occurredAt: '2026-10-25T12:30:00.000Z', appointmentId: String(new mongoose.Types.ObjectId()) },
      }, response()),
      error => error.status === 400 && /does not belong/.test(error.message),
    )
    assert.equal(createCalled, false)
  })

  it('rejects invalid severity and unknown patient-supplied ownership fields', async () => {
    let createCalled = false
    stub(SymptomEntry, 'create', async () => { createCalled = true })
    await assert.rejects(
      controller.create({
        user: { _id: new mongoose.Types.ObjectId() },
        body: { symptom: 'Pain', category: 'pain', severity: 11, occurredAt: '2026-10-25T12:30:00.000Z' },
      }, response()),
      error => error.status === 400,
    )
    await assert.rejects(
      controller.create({
        user: { _id: new mongoose.Types.ObjectId() },
        body: { owner: String(new mongoose.Types.ObjectId()), symptom: 'Pain', category: 'pain', severity: 5, occurredAt: '2026-10-25T12:30:00.000Z' },
      }, response()),
      error => error.status === 400 && /Unsupported/.test(error.message),
    )
    assert.equal(createCalled, false)
  })

  it('scopes filtered journal reads to the authenticated patient', async () => {
    const owner = new mongoose.Types.ObjectId()
    let filter
    stub(SymptomEntry, 'find', value => { filter = value; return query([]) })
    const res = response()
    await controller.list({ user: { _id: owner }, query: { from: '2026-10-01', to: '2026-10-31', category: 'pain', severity: '7', symptom: 'Headache' } }, res)
    assert.equal(String(filter.owner), String(owner))
    assert.equal(filter.category, 'pain')
    assert.equal(filter.severity, 7)
    assert.equal(filter.symptom.test('headache'), true)
    assert.equal(filter.symptom.test('Headaches'), false)
    assert.equal(filter.occurredAt.$gte.toISOString(), '2026-10-01T00:00:00.000Z')
    assert.equal(filter.occurredAt.$lt.toISOString(), '2026-11-01T00:00:00.000Z')
    assert.deepEqual(res.body.entries, [])
  })

  it('updates and deletes only records matching both entry id and patient owner', async () => {
    const owner = new mongoose.Types.ObjectId()
    const entryId = new mongoose.Types.ObjectId()
    let updateFilter
    const entry = {
      _id: entryId,
      owner,
      symptom: 'Headache',
      category: 'pain',
      severity: 5,
      occurredAt: new Date('2026-10-24T12:00:00.000Z'),
      durationValue: null,
      durationUnit: '',
      appointment: null,
      save: async function () {},
      populate: async function () { return this },
    }
    stub(SymptomEntry, 'findOne', async filter => { updateFilter = filter; return entry })
    stub(SymptomEntry, 'findOneAndDelete', async filter => { updateFilter = filter; return entry })
    const updated = response()
    await controller.update({ user: { _id: owner }, params: { id: String(entryId) }, body: { severity: 8 } }, updated)
    assert.equal(String(updateFilter.owner), String(owner))
    assert.equal(String(updateFilter._id), String(entryId))
    assert.equal(entry.severity, 8)
    assert.equal(updated.body.entry.severity, 8)

    const deleted = response()
    await controller.remove({ user: { _id: owner }, params: { id: String(entryId) } }, deleted)
    assert.equal(String(updateFilter.owner), String(owner))
    assert.equal(String(updateFilter._id), String(entryId))
    assert.equal(deleted.body.message, 'Symptom entry deleted')
  })

  it('returns trend counts, averages, and buckets based on real matching entries', async () => {
    const owner = new mongoose.Types.ObjectId()
    const dates = [
      { symptom: 'Headache', category: 'pain', severity: 7, occurredAt: new Date('2026-10-05T10:00:00.000Z') },
      { symptom: 'Headache', category: 'pain', severity: 7, occurredAt: new Date('2026-10-06T10:00:00.000Z') },
      { symptom: 'Nausea', category: 'pain', severity: 7, occurredAt: new Date('2026-10-06T11:00:00.000Z') },
    ].filter(entry => entry.severity === 7)
    let filter
    stub(SymptomEntry, 'find', value => { filter = value; return query(dates) })
    const res = response()
    await controller.trends({
      user: { _id: owner },
      query: { from: '2026-10-01', to: '2026-10-31', groupBy: 'day', category: 'pain', severity: '7', symptom: 'Headache' },
    }, res)
    assert.equal(String(filter.owner), String(owner))
    assert.equal(filter.category, 'pain')
    assert.equal(filter.severity, 7)
    assert.equal(res.body.count, 2)
    assert.equal(res.body.averageSeverity, 7)
    assert.equal(res.body.points.length, 2)
    assert.equal(res.body.points[0].period, '2026-10-05')
    assert.equal(res.body.points[0].count, 1)
    assert.equal(res.body.frequentSymptoms[0].symptom, 'Headache')
    assert.equal(res.body.frequentSymptoms[0].count, 2)
  })

  it('validates export ranges and returns only owner records without exporting owner identifiers', async () => {
    const owner = new mongoose.Types.ObjectId()
    const entry = {
      owner,
      symptom: 'Fatigue',
      severity: 3,
      toObject: () => ({ owner, symptom: 'Fatigue', severity: 3, notes: 'Patient note' }),
    }
    let entryFilter
    stub(SymptomEntry, 'find', filter => { entryFilter = filter; return query([entry]) })
    stub(User, 'findById', id => {
      assert.equal(String(id), String(owner))
      return { select: async () => ({ name: 'Patient' }) }
    })
    const res = response()
    await controller.exportHistory({ user: { _id: owner }, query: { from: '2026-10-01', to: '2026-10-31' } }, res)
    assert.equal(String(entryFilter.owner), String(owner))
    assert.equal(res.body.entries[0].owner, undefined)
    assert.equal(res.body.summary.count, 1)
    assert.match(res.body.disclaimer, /not a medical diagnosis/)
    assert.equal(res.headers['Cache-Control'], 'private, no-store')
    await assert.rejects(
      controller.exportHistory({ user: { _id: owner }, query: { from: '2026-11-01', to: '2026-10-01' } }, response()),
      error => error.status === 400 && /start date/.test(error.message),
    )
  })
})
