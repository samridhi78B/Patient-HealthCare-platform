const { EventEmitter } = require('node:events')
const { it } = require('node:test')
const assert = require('node:assert/strict')
const summaryCooldown = require('../middleware/summaryCooldown')

function invoke(req) {
  const res = new EventEmitter()
  res.status = status => { res.statusCode = status; return res }
  res.json = body => { res.body = body; return res }
  let nextCalled = false
  summaryCooldown(req, res, () => { nextCalled = true })
  return { res, nextCalled }
}

it('blocks duplicate summaries for the same patient and report for five seconds', () => {
  const req = { user: { _id: 'patient-1' }, params: { id: 'report-1' } }
  const first = invoke(req)
  assert.equal(first.nextCalled, true)

  const inFlightDuplicate = invoke(req)
  assert.equal(inFlightDuplicate.nextCalled, false)
  assert.equal(inFlightDuplicate.res.statusCode, 429)
  assert.match(inFlightDuplicate.res.body.message, /Wait 5 seconds/)
  first.res.emit('finish')

  const cooldownDuplicate = invoke(req)
  assert.equal(cooldownDuplicate.nextCalled, false)
  assert.equal(cooldownDuplicate.res.statusCode, 429)

  const otherReport = invoke({ user: req.user, params: { id: 'report-2' } })
  const otherPatient = invoke({ user: { _id: 'patient-2' }, params: req.params })
  assert.equal(otherReport.nextCalled, true)
  assert.equal(otherPatient.nextCalled, true)
  otherReport.res.emit('finish')
  otherPatient.res.emit('finish')
})
