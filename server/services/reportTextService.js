const fs = require('fs/promises')
const pdfParse = require('pdf-parse')
const { createWorker } = require('tesseract.js')

const httpErr = (status, message) => Object.assign(new Error(message), { status })
const MAX_TEXT_LENGTH = 60000

function validateExtractedText(text) {
  const cleaned = String(text || '').replace(/\u0000/g, '').trim()
  if (cleaned.length < 20) {
    throw httpErr(422, 'No readable report text was found. Check the scan or upload a clearer document.')
  }
  if (cleaned.length > MAX_TEXT_LENGTH) {
    throw httpErr(413, 'The report contains too much text to summarize safely. Upload a shorter report.')
  }
  return cleaned
}

async function extractReportText(filePath, mimeType) {
  const file = await fs.readFile(filePath)
  let text = ''

  if (mimeType === 'application/pdf') {
    let parsed
    try {
      parsed = await pdfParse(file, { max: 30 })
    } catch {
      throw httpErr(422, 'This PDF could not be read. Upload a valid PDF and try again.')
    }
    if (parsed.numpages > 30) throw httpErr(413, 'PDF reports may contain no more than 30 pages for summarization')
    text = parsed.text
  } else if (mimeType === 'image/jpeg' || mimeType === 'image/png') {
    let worker
    try {
      worker = await createWorker('eng')
      const result = await worker.recognize(file)
      text = result.data.text
    } catch {
      throw httpErr(503, 'Image text recognition is unavailable. Try again or upload a PDF with selectable text.')
    } finally {
      if (worker) await worker.terminate()
    }
  } else {
    throw httpErr(415, 'Summaries support PDF, JPG and PNG reports only')
  }

  return validateExtractedText(text)
}

module.exports = { extractReportText, validateExtractedText, MAX_TEXT_LENGTH }
