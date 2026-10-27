const { afterEach, describe, it } = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const WellnessLog = require('../models/WellnessLog')
const controller = require('../controllers/wellnessController')

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
const owner = () => new mongoose.Types.ObjectId()
const body = (overrides = {}) => ({
  date: '2025-02-28',
  sleepHours: 7.5,
  waterLitres: 2.2,
  activityMinutes: 45,
  mealsRegular: true,
  ...overrides,
})

afterEach(() => {
  while (originals.length) {
    const [target, key, value] = originals.pop()
    target[key] = value
  }
})

describe('daily wellness controller', () => {
  it('creates a log using the authenticated owner and validated data', async () => {
    const patient = owner()
    let duplicateFilter
    let saved
    stub(WellnessLog, 'findOne', filter => {
      duplicateFilter = filter
      return { select: async () => null }
    })
    stub(WellnessLog, 'create', async document => {
      saved = document
      return { ...document, _id: new mongoose.Types.ObjectId() }
    })

    const res = response()
    await controller.create({ user: { _id: patient }, body: body() }, res)
    assert.equal(res.statusCode, 201)
    assert.equal(String(saved.owner), String(patient))
    assert.equal(saved.date.toISOString(), '2025-02-28T00:00:00.000Z')
    assert.deepEqual(duplicateFilter, { owner: patient, date: saved.date })
  })

  it('rejects duplicate daily logs and patient-supplied ownership fields', async () => {
    const patient = owner()
    let createCalled = false
    stub(WellnessLog, 'findOne', filter => ({
      select: async () => filter.owner === patient ? { _id: new mongoose.Types.ObjectId() } : null,
    }))
    stub(WellnessLog, 'create', async () => { createCalled = true })

    await assert.rejects(
      controller.create({ user: { _id: patient }, body: body() }, response()),
      error => error.status === 409,
    )
    await assert.rejects(
      controller.create({ user: { _id: patient }, body: body({ owner: String(owner()) }) }, response()),
      error => error.status === 400,
    )
    assert.equal(createCalled, false)
  })

  it('validates all lifestyle values and strict calendar dates', async () => {
    let createCalled = false
    stub(WellnessLog, 'findOne', () => ({ select: async () => null }))
    stub(WellnessLog, 'create', async () => { createCalled = true })
    for (const invalid of [
      { sleepHours: 24.1 },
      { waterLitres: -0.1 },
      { activityMinutes: 1.5 },
      { sleepHours: '' },
      { waterLitres: '2.5' },
      { mealsRegular: 'yes' },
      { date: '2025-02-30' },
      { date: '2999-01-01' },
    ]) {
      await assert.rejects(
        controller.create({ user: { _id: owner() }, body: body(invalid) }, response()),
        error => error.status === 400,
      )
    }
    const incomplete = body()
    delete incomplete.activityMinutes
    await assert.rejects(
      controller.create({ user: { _id: owner() }, body: incomplete }, response()),
      error => error.status === 400,
    )
    assert.equal(createCalled, false)
  })

  it('lists only the authenticated owner within the requested date range', async () => {
    const patient = owner()
    const expectedLogs = [{ date: new Date('2025-02-28T00:00:00.000Z') }]
    let filter
    stub(WellnessLog, 'find', value => {
      filter = value
      return { sort: async () => expectedLogs }
    })
    const res = response()
    await controller.list({ user: { _id: patient }, query: { from: '2025-02-01', to: '2025-02-28' } }, res)

    assert.equal(String(filter.owner), String(patient))
    assert.deepEqual(filter.date, {
      $gte: new Date('2025-02-01T00:00:00.000Z'),
      $lte: new Date('2025-02-28T00:00:00.000Z'),
    })
    assert.deepEqual(res.body.logs, expectedLogs)
  })

  it('updates only a log owned by the authenticated patient', async () => {
    const patient = owner()
    const id = String(owner())
    let lookup
    const record = {
      date: new Date('2025-02-28T00:00:00.000Z'),
      sleepHours: 6,
      waterLitres: 1,
      activityMinutes: 20,
      mealsRegular: false,
      save: async function () { this.saved = true },
    }
    stub(WellnessLog, 'findOne', filter => {
      lookup = filter
      return Promise.resolve(record)
    })

    const res = response()
    await controller.update({ params: { id }, user: { _id: patient }, body: body({ sleepHours: 8 }) }, res)
    assert.deepEqual(lookup, { _id: id, owner: patient })
    assert.equal(record.sleepHours, 8)
    assert.equal(record.saved, true)

    stub(WellnessLog, 'findOne', () => Promise.resolve(null))
    await assert.rejects(
      controller.update({ params: { id }, user: { _id: owner() }, body: body() }, response()),
      error => error.status === 404,
    )
  })

  it('prevents changing a log to another existing date', async () => {
    const patient = owner()
    const id = owner()
    const record = {
      _id: id,
      date: new Date('2025-02-28T00:00:00.000Z'),
      sleepHours: 6,
      waterLitres: 1,
      activityMinutes: 20,
      mealsRegular: false,
      save: async () => assert.fail('Must not save a duplicate day'),
    }
    let calls = 0
    stub(WellnessLog, 'findOne', () => {
      calls += 1
      if (calls === 1) return Promise.resolve(record)
      return { select: async () => ({ _id: owner() }) }
    })

    await assert.rejects(
      controller.update({
        params: { id: String(id) },
        user: { _id: patient },
        body: body({ date: '2025-03-01' }),
      }, response()),
      error => error.status === 409,
    )
  })
})
