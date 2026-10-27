const { afterEach, describe, it } = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const HealthMeasurement = require('../models/HealthMeasurement')
const controller = require('../controllers/measurementController')

const originals = []
const stub = (target, key, value) => {
  originals.push([target, key, target[key]])
  target[key] = value
}
const response = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this },
  json(body) { this.body = body; return this },
})
const patient = () => new mongoose.Types.ObjectId()
const data = (overrides = {}) => ({
  measuredAt: new Date().toISOString().slice(0, 10),
  heightCm: 170,
  weightKg: 68,
  waistCm: null,
  ...overrides,
})

afterEach(() => {
  while (originals.length) {
    const [target, key, value] = originals.pop()
    target[key] = value
  }
})

describe('patient health measurements controller', () => {
  it('lists only records belonging to the authenticated patient', async () => {
    const owner = patient()
    let filter
    const records = [{ heightCm: 170, weightKg: 68 }]
    stub(HealthMeasurement, 'find', query => {
      filter = query
      return { sort: async () => records }
    })
    const res = response()
    await controller.list({ user: { _id: owner } }, res)
    assert.deepEqual(filter, { owner })
    assert.deepEqual(res.body.measurements, records)
  })

  it('creates validated measurements under the authenticated owner', async () => {
    const owner = patient()
    let saved
    stub(HealthMeasurement, 'findOne', () => ({ select: async () => null }))
    stub(HealthMeasurement, 'create', async record => { saved = record; return { ...record, _id: patient() } })
    const res = response()
    await controller.create({ user: { _id: owner }, body: data({ waistCm: 82 }) }, res)
    assert.equal(res.statusCode, 201)
    assert.equal(String(saved.owner), String(owner))
    assert.equal(saved.measuredAt.toISOString().slice(0, 10), data().measuredAt)
  })

  it('rejects duplicate dates and invalid values before saving', async () => {
    let createCalled = false
    stub(HealthMeasurement, 'findOne', () => ({ select: async () => ({ _id: patient() }) }))
    stub(HealthMeasurement, 'create', async () => { createCalled = true })
    await assert.rejects(controller.create({ user: { _id: patient() }, body: data() }, response()), error => error.status === 409)

    stub(HealthMeasurement, 'findOne', () => ({ select: async () => null }))
    for (const invalid of [
      { heightCm: 0 },
      { heightCm: 400 },
      { weightKg: -1 },
      { weightKg: 400 },
      { waistCm: 10 },
      { measuredAt: '2025-02-30' },
      { owner: String(patient()) },
    ]) {
      await assert.rejects(controller.create({ user: { _id: patient() }, body: data(invalid) }, response()), error => error.status === 400)
    }
    assert.equal(createCalled, false)
  })

  it('updates and deletes only a record owned by the authenticated patient', async () => {
    const owner = patient()
    const id = patient()
    let updateFilter
    stub(HealthMeasurement, 'findOne', () => ({ select: async () => null }))
    stub(HealthMeasurement, 'findOneAndUpdate', async (filter, updates) => {
      updateFilter = filter
      return { _id: id, ...updates.$set }
    })
    stub(HealthMeasurement, 'findOneAndDelete', async filter => {
      updateFilter = filter
      return filter.owner.equals(owner) ? { _id: id } : null
    })
    const updated = response()
    await controller.update({ params: { id: String(id) }, user: { _id: owner }, body: data({ weightKg: 69 }) }, updated)
    assert.equal(String(updateFilter.owner), String(owner))
    assert.equal(updated.body.measurement.weightKg, 69)

    const deleted = response()
    await controller.remove({ params: { id: String(id) }, user: { _id: owner } }, deleted)
    assert.equal(String(updateFilter.owner), String(owner))
    assert.equal(deleted.body.message, 'Measurement deleted')
    await assert.rejects(controller.remove({ params: { id: String(id) }, user: { _id: patient() } }, response()), error => error.status === 404)
  })
})
