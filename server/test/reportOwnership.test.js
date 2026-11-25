const { it } = require('node:test')
const assert = require('node:assert/strict')
const MedicalReport = require('../models/MedicalReport')
const controller = require('../controllers/reportController')

it('does not let one patient read another patient report by MongoDB id', async () => {
  let filter
  const original = MedicalReport.findOne
  MedicalReport.findOne = async query => { filter = query; return null }
  try {
    await assert.rejects(
      controller.getOne({
        params: { id: '64b64c3f4f4a7b2d8e3f1234' },
        user: { _id: '64b64c3f4f4a7b2d8e3f5678' },
      }, { json() {} }),
      error => error.status === 404,
    )
    assert.equal(filter.owner, '64b64c3f4f4a7b2d8e3f5678')
  } finally {
    MedicalReport.findOne = original
  }
})
