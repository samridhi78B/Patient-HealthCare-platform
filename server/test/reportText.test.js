const { it } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs/promises')
const os = require('os')
const path = require('path')
const { extractReportText, validateExtractedText } = require('../services/reportTextService')

it('returns a useful validation error for an invalid PDF', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'medlink-report-'))
  const file = path.join(directory, 'invalid.pdf')
  try {
    await fs.writeFile(file, 'not a pdf document')
    await assert.rejects(
      extractReportText(file, 'application/pdf'),
      error => error.status === 422 && /valid PDF/.test(error.message),
    )
  } finally {
    await fs.rm(directory, { recursive: true, force: true })
  }
})

it('rejects empty extracted text before summarization', () => {
  assert.throws(
    () => validateExtractedText(''),
    error => error.status === 422 && /No readable report text/.test(error.message),
  )
})
