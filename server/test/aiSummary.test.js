const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { normalizeSummary, generateSummary, groundSummary } = require('../services/aiSummaryService')

const validSummary = {
  overview: 'A blood test report with values shown below.',
  parameters: [{
    name: 'Hemoglobin',
    value: '12.1',
    unit: 'g/dL',
    referenceRange: '13.0-17.0 g/dL',
    status: 'outside_range',
    explanation: 'The report marks this value below its stated range.',
    evidence: 'Hemoglobin 12.1 g/dL (13.0-17.0 g/dL)',
  }],
  terminology: [{ term: 'CBC', explanation: 'A complete blood count.' }],
  observationsToDiscuss: ['Ask your doctor how this result fits your health history.'],
  missingOrUnclear: ['The report does not include a collection date.'],
  explicitDiagnoses: [],
}

describe('AI medical summary validation', () => {
  it('keeps extracted values and report-provided reference ranges without converting them', () => {
    const summary = normalizeSummary(validSummary)
    assert.equal(summary.parameters[0].value, '12.1')
    assert.equal(summary.parameters[0].referenceRange, '13.0-17.0 g/dL')
    assert.equal(summary.parameters[0].status, 'outside_range')
    assert.equal(summary.explicitDiagnoses.length, 0)
    assert.match(summary.disclaimer, /not a diagnosis/)
  })

  it('rejects a malformed AI response instead of saving an incomplete summary', () => {
    assert.throws(() => normalizeSummary({ overview: 'Incomplete' }), error => error.status === 502)
  })

  it('removes unsupported findings and does not invent a reference range or diagnosis', () => {
    const summary = normalizeSummary({
      ...validSummary,
      parameters: [
        validSummary.parameters[0],
        { ...validSummary.parameters[0], name: 'Invented value', value: '999', evidence: 'Invented value 999' },
      ],
      explicitDiagnoses: [{ text: 'Condition not stated in report', evidence: 'Condition not stated in report' }],
    })
    const grounded = groundSummary(summary, 'Hemoglobin 12.1 g/dL (13.0-17.0 g/dL)')
    assert.equal(grounded.parameters.length, 1)
    assert.equal(grounded.parameters[0].status, 'outside_range')
    assert.equal(grounded.explicitDiagnoses.length, 0)
  })

  it('reports a missing Gemini key with the server environment setting', async () => {
    const original = process.env.GEMINI_API_KEY
    delete process.env.GEMINI_API_KEY
    try {
      await assert.rejects(
        generateSummary('A report value'),
        error => error.status === 503 && error.message === 'GEMINI_API_KEY missing in server/.env',
      )
    } finally {
      if (original === undefined) delete process.env.GEMINI_API_KEY
      else process.env.GEMINI_API_KEY = original
    }
  })

  it('sends the existing report prompt to Gemini and parses its structured response', async () => {
    const originalKey = process.env.GEMINI_API_KEY
    const originalFetch = global.fetch
    const originalConsoleLog = console.log
    const reportText = 'Hemoglobin 12.1 g/dL (13.0-17.0 g/dL)'
    const requests = []
    let loggedModels
    process.env.GEMINI_API_KEY = 'test-key'
    console.log = (_message, names) => { loggedModels = names }
    global.fetch = async (url, options) => {
      const request = { url: new URL(url), options }
      requests.push(request)
      if (request.url.pathname === '/v1beta/models') {
        return new Response(JSON.stringify({ models: [
          { name: 'models/gemini-pro-latest', supportedGenerationMethods: ['generateContent'] },
          { name: 'models/gemini-1.5-flash', supportedGenerationMethods: ['generateContent'] },
          { name: 'models/gemini-flash-latest', supportedGenerationMethods: ['generateContent'] },
          { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
          { name: 'models/gemini-flash-preview', supportedGenerationMethods: ['embedContent'] },
        ] }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      return new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: JSON.stringify(validSummary) }] } }],
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    try {
      const summary = await generateSummary(reportText)
      assert.equal(requests.length, 2)
      assert.equal(requests[0].url.origin, 'https://generativelanguage.googleapis.com')
      assert.equal(requests[0].url.pathname, '/v1beta/models')
      assert.equal(requests[0].url.searchParams.get('key'), 'test-key')
      assert.deepEqual(loggedModels, [
        'models/gemini-pro-latest',
        'models/gemini-1.5-flash',
        'models/gemini-flash-latest',
        'models/gemini-2.5-flash',
        'models/gemini-flash-preview',
      ])
      assert.equal(requests[1].url.pathname, '/v1beta/models/gemini-2.5-flash:generateContent')
      assert.equal(requests[1].options.method, 'POST')
      const body = JSON.parse(requests[1].options.body)
      assert.equal(body.contents[0].parts[0].text.includes(`REPORT TEXT:\n${reportText}`), true)
      assert.equal(body.generationConfig.responseMimeType, 'application/json')
      assert.equal(summary.overview, validSummary.overview)
      assert.equal(summary.model, 'gemini-2.5-flash')
    } finally {
      global.fetch = originalFetch
      console.log = originalConsoleLog
      if (originalKey === undefined) delete process.env.GEMINI_API_KEY
      else process.env.GEMINI_API_KEY = originalKey
    }
  })

  it('uses the first listed Flash model that supports generateContent if gemini-flash-latest is absent', async () => {
    const originalKey = process.env.GEMINI_API_KEY
    const originalFetch = global.fetch
    const originalConsoleLog = console.log
    process.env.GEMINI_API_KEY = 'test-key'
    console.log = () => {}
    global.fetch = async url => {
      const requestUrl = new URL(url)
      if (requestUrl.pathname === '/v1beta/models') {
        return new Response(JSON.stringify({ models: [
          { name: 'models/gemini-pro-latest', supportedGenerationMethods: ['generateContent'] },
          { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
          { name: 'models/gemini-flash-lite-latest', supportedGenerationMethods: ['generateContent'] },
        ] }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      return new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: JSON.stringify(validSummary) }] } }],
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    try {
      const summary = await generateSummary('Hemoglobin 12.1 g/dL (13.0-17.0 g/dL)')
      assert.equal(summary.model, 'gemini-2.5-flash')
    } finally {
      global.fetch = originalFetch
      console.log = originalConsoleLog
      if (originalKey === undefined) delete process.env.GEMINI_API_KEY
      else process.env.GEMINI_API_KEY = originalKey
    }
  })

  it('falls back to the next listed model when a model returns an invalid summary', async () => {
    const originalKey = process.env.GEMINI_API_KEY
    const originalFetch = global.fetch
    const originalConsoleLog = console.log
    const originalConsoleError = console.error
    const attemptedModels = []
    process.env.GEMINI_API_KEY = 'test-key'
    console.log = () => {}
    console.error = () => {}
    global.fetch = async url => {
      const requestUrl = new URL(url)
      if (requestUrl.pathname === '/v1beta/models') {
        return new Response(JSON.stringify({ models: [
          { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
          { name: 'models/gemini-flash-latest', supportedGenerationMethods: ['generateContent'] },
        ] }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      const model = requestUrl.pathname.split('/').pop().replace(':generateContent', '')
      attemptedModels.push(model)
      const text = model === 'gemini-2.5-flash' ? '{}' : JSON.stringify(validSummary)
      return new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text }] } }],
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    try {
      const summary = await generateSummary('Hemoglobin 12.1 g/dL (13.0-17.0 g/dL)')
      assert.deepEqual(attemptedModels, ['gemini-2.5-flash', 'gemini-flash-latest'])
      assert.equal(summary.model, 'gemini-flash-latest')
    } finally {
      global.fetch = originalFetch
      console.log = originalConsoleLog
      console.error = originalConsoleError
      if (originalKey === undefined) delete process.env.GEMINI_API_KEY
      else process.env.GEMINI_API_KEY = originalKey
    }
  })

  it('returns the busy message when the provider connection fails', async () => {
    const originalKey = process.env.GEMINI_API_KEY
    const originalFetch = global.fetch
    const originalConsoleError = console.error
    process.env.GEMINI_API_KEY = 'test-key'
    console.error = () => {}
    global.fetch = async url => {
      if (new URL(url).pathname === '/v1beta/models') {
        return new Response(JSON.stringify({ models: [
          { name: 'models/gemini-flash-latest', supportedGenerationMethods: ['generateContent'] },
        ] }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      throw new Error('offline test transport')
    }
    try {
      await assert.rejects(
        generateSummary('A report value'),
        error => error.status === 429 && error.message === 'AI is busy right now, please wait 30 seconds and try again',
      )
    } finally {
      global.fetch = originalFetch
      console.error = originalConsoleError
      if (originalKey === undefined) delete process.env.GEMINI_API_KEY
      else process.env.GEMINI_API_KEY = originalKey
    }
  })

  it('explains Gemini quota errors without exposing provider response details', async () => {
    const originalKey = process.env.GEMINI_API_KEY
    const originalFetch = global.fetch
    const originalConsoleError = console.error
    const delays = []
    let attempts = 0
    process.env.GEMINI_API_KEY = 'test-key'
    console.error = () => {}
    global.fetch = async url => {
      if (new URL(url).pathname === '/v1beta/models') {
        return new Response(JSON.stringify({ models: [
          { name: 'models/gemini-flash-latest', supportedGenerationMethods: ['generateContent'] },
        ] }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      attempts += 1
      return new Response(JSON.stringify({
        error: { message: 'Sensitive provider response details', status: 'RESOURCE_EXHAUSTED', code: 429 },
      }), { status: 429, headers: { 'content-type': 'application/json' } })
    }
    try {
      await assert.rejects(
        generateSummary('A report value', { wait: async delay => delays.push(delay) }),
        error => error.status === 429 && error.message === 'AI is busy right now, please wait 30 seconds and try again' && !error.message.includes('Sensitive'),
      )
      assert.deepEqual(delays, [2000, 4000, 8000])
      assert.equal(attempts, 4)
    } finally {
      global.fetch = originalFetch
      console.error = originalConsoleError
      if (originalKey === undefined) delete process.env.GEMINI_API_KEY
      else process.env.GEMINI_API_KEY = originalKey
    }
  })

  it('logs the complete Gemini error body when generateContent returns 404', async () => {
    const originalKey = process.env.GEMINI_API_KEY
    const originalFetch = global.fetch
    const originalConsoleError = console.error
    const logged = []
    const providerError = { error: { code: 404, message: 'Model is not available for this API version.', status: 'NOT_FOUND' } }
    process.env.GEMINI_API_KEY = 'test-key'
    console.error = (...args) => { logged.push(args) }
    global.fetch = async url => {
      if (new URL(url).pathname === '/v1beta/models') {
        return new Response(JSON.stringify({ models: [
          { name: 'models/gemini-flash-latest', supportedGenerationMethods: ['generateContent'] },
        ] }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      return new Response(JSON.stringify(providerError), { status: 404, headers: { 'content-type': 'application/json' } })
    }
    try {
      await assert.rejects(generateSummary('A report value'), error => error.status === 503)
      assert.equal(logged.length, 1)
      assert.deepEqual(logged[0][1].response, providerError)
    } finally {
      global.fetch = originalFetch
      console.error = originalConsoleError
      if (originalKey === undefined) delete process.env.GEMINI_API_KEY
      else process.env.GEMINI_API_KEY = originalKey
    }
  })

  it('reports Gemini high demand as a temporary error', async () => {
    const originalKey = process.env.GEMINI_API_KEY
    const originalFetch = global.fetch
    const originalConsoleLog = console.log
    const originalConsoleError = console.error
    const delays = []
    let attempts = 0
    process.env.GEMINI_API_KEY = 'test-key'
    console.log = () => {}
    console.error = () => {}
    global.fetch = async url => {
      if (new URL(url).pathname === '/v1beta/models') {
        return new Response(JSON.stringify({ models: [
          { name: 'models/gemini-flash-latest', supportedGenerationMethods: ['generateContent'] },
        ] }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      attempts += 1
      return new Response(JSON.stringify({
        error: { code: 503, message: 'Temporary high demand', status: 'UNAVAILABLE' },
      }), { status: 503, headers: { 'content-type': 'application/json' } })
    }
    try {
      await assert.rejects(
        generateSummary('A report value', { wait: async delay => delays.push(delay) }),
        error => error.status === 429 && error.message === 'AI is busy right now, please wait 30 seconds and try again',
      )
      assert.deepEqual(delays, [2000, 4000, 8000])
      assert.equal(attempts, 4)
    } finally {
      global.fetch = originalFetch
      console.log = originalConsoleLog
      console.error = originalConsoleError
      if (originalKey === undefined) delete process.env.GEMINI_API_KEY
      else process.env.GEMINI_API_KEY = originalKey
    }
  })

  it('falls back to the next listed text Flash model after overload or a listed-model 404', async () => {
    const originalKey = process.env.GEMINI_API_KEY
    const originalFetch = global.fetch
    const originalConsoleLog = console.log
    const originalConsoleError = console.error
    const originalConsoleWarn = console.warn
    const delays = []
    const attemptedModels = []
    process.env.GEMINI_API_KEY = 'test-key'
    console.log = () => {}
    console.error = () => {}
    console.warn = () => {}
    global.fetch = async url => {
      const requestUrl = new URL(url)
      if (requestUrl.pathname === '/v1beta/models') {
        return new Response(JSON.stringify({ models: [
          { name: 'models/gemini-flash-latest', supportedGenerationMethods: ['generateContent'] },
          { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
          { name: 'models/gemini-2.5-flash-preview-tts', supportedGenerationMethods: ['generateContent'] },
          { name: 'models/gemini-flash-lite-latest', supportedGenerationMethods: ['generateContent'] },
        ] }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      const model = requestUrl.pathname.split('/').pop().replace(':generateContent', '')
      attemptedModels.push(model)
      if (model === 'gemini-flash-latest') {
        return new Response(JSON.stringify({ error: { code: 503, message: 'High demand' } }), { status: 503 })
      }
      if (model === 'gemini-2.5-flash') {
        return new Response(JSON.stringify({ error: { code: 404, message: 'Model is unavailable to this user' } }), { status: 404 })
      }
      return new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: JSON.stringify(validSummary) }] } }],
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    try {
      const summary = await generateSummary('Hemoglobin 12.1 g/dL (13.0-17.0 g/dL)', { wait: async delay => delays.push(delay) })
      assert.deepEqual(attemptedModels, [
        'gemini-2.5-flash',
        'gemini-flash-latest',
        'gemini-flash-latest',
        'gemini-flash-latest',
        'gemini-flash-latest',
        'gemini-flash-lite-latest',
      ])
      assert.equal(summary.model, 'gemini-flash-lite-latest')
      assert.deepEqual(delays, [2000, 4000, 8000])
    } finally {
      global.fetch = originalFetch
      console.log = originalConsoleLog
      console.error = originalConsoleError
      console.warn = originalConsoleWarn
      if (originalKey === undefined) delete process.env.GEMINI_API_KEY
      else process.env.GEMINI_API_KEY = originalKey
    }
  })
})
