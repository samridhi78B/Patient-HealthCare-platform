const { it } = require('node:test')
const assert = require('node:assert/strict')
const MedicalReport = require('../models/MedicalReport')

it('does not expose legacy AI summaries from stored reports', () => {
  const report = MedicalReport.hydrate({
    _id: '64b64c3f4f4a7b2d8e3f9999',
    owner: '64b64c3f4f4a7b2d8e3f9998',
    title: 'Blood report',
    category: 'Blood Test',
    originalName: 'blood.pdf',
    storedName: 'blood-report.pdf',
    mimeType: 'application/pdf',
    size: 100,
    aiSummary: { overview: 'Legacy generated summary' },
  })

  assert.equal(report.toJSON().aiSummary, undefined)
})
