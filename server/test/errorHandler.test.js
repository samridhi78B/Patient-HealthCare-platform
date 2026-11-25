const { it } = require('node:test')
const assert = require('node:assert/strict')
const { errorHandler } = require('../middleware/errorHandler')

it('returns the exact busy message in both error and message fields for rate limits', () => {
  const message = 'AI is busy right now, please wait 30 seconds and try again'
  const err = Object.assign(new Error(message), { status: 429 })
  const res = {
    statusCode: null,
    body: null,
    status(status) { this.statusCode = status; return this },
    json(body) { this.body = body; return this },
  }

  errorHandler(err, {}, res, () => {})

  assert.equal(res.statusCode, 429)
  assert.deepEqual(res.body, { message, error: message })
})
