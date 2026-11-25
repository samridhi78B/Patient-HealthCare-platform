const { afterEach, it } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const mongoose = require('mongoose')
const MedicalReport = require('../models/MedicalReport')
const MedicalHistoryItem = require('../models/MedicalHistoryItem')
const textService = require('../services/reportTextService')
const aiService = require('../services/aiSummaryService')

const originalFindOne = MedicalReport.findOne
const originalBulkWrite = MedicalHistoryItem.bulkWrite
const originalExistsSync = fs.existsSync
const originalExtract = textService.extractReportText
const originalGenerate = aiService.generateSummary

afterEach(() => {
  MedicalReport.findOne = originalFindOne
  MedicalHistoryItem.bulkWrite = originalBulkWrite
  fs.existsSync = originalExistsSync
  textService.extractReportText = originalExtract
  aiService.generateSummary = originalGenerate
  delete require.cache[require.resolve('../controllers/reportController')]
})

it('generates, saves, creates unverified source-linked findings, and returns a saved report summary', async () => {
  const owner = new mongoose.Types.ObjectId()
  const report = new MedicalReport({
    owner,
    title: 'Blood report',
    category: 'Blood Test',
    originalName: 'blood.pdf',
    storedName: 'private-test-report.pdf',
    mimeType: 'application/pdf',
    size: 100,
  })
  let saveCount = 0
  let historyWrites
  report.save = async () => { saveCount += 1; return report }
  MedicalReport.findOne = async () => report
  fs.existsSync = () => true
  textService.extractReportText = async (_file, type) => {
    assert.equal(type, 'application/pdf')
    return 'Hemoglobin 12.1 g/dL (13.0-17.0 g/dL)'
  }
  aiService.generateSummary = async () => ({
    overview: 'The report contains a hemoglobin measurement.',
    parameters: [{
      name: 'Hemoglobin',
      value: '12.1',
      unit: 'g/dL',
      referenceRange: '13.0-17.0 g/dL',
      status: 'outside_range',
      explanation: 'The report marks this result below its stated reference interval.',
      evidence: 'Hemoglobin 12.1 g/dL (13.0-17.0 g/dL)',
    }],
    terminology: [],
    observationsToDiscuss: ['Discuss the result with a doctor.'],
    missingOrUnclear: [],
    explicitDiagnoses: [],
    disclaimer: 'Informational only.',
    model: 'gemini-flash-latest',
  })
  MedicalHistoryItem.bulkWrite = async updates => { historyWrites = updates; return { ok: 1 } }
  const controller = require('../controllers/reportController')
  const req = { params: { id: report._id.toString() }, user: { _id: owner } }
  const res = { body: null, json(body) { this.body = body; return this } }

  await controller.generateAiSummary(req, res)
  assert.equal(saveCount, 1)
  assert.equal(res.body.report.aiSummary.parameters[0].value, '12.1')
  assert.equal(historyWrites.length, 1)
  assert.equal(historyWrites[0].updateOne.update.$setOnInsert.source, 'report-extracted')
  assert.equal(historyWrites[0].updateOne.update.$setOnInsert.verificationStatus, 'unreviewed')
  assert.equal(historyWrites[0].updateOne.update.$setOnInsert.report.toString(), report._id.toString())

  const viewResponse = { body: null, json(body) { this.body = body; return this } }
  await controller.getOne(req, viewResponse)
  assert.equal(viewResponse.body.report.aiSummary.overview, 'The report contains a hemoglobin measurement.')
})
