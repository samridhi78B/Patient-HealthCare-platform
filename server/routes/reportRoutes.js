const router = require('express').Router()
const rateLimit = require('express-rate-limit')
const c = require('../controllers/reportController')
const { protect } = require('../middleware/authMiddleware')
const { upload } = require('../middleware/upload')
const summaryCooldown = require('../middleware/summaryCooldown')
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
const summaryLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many summary requests. Try again later.' },
})
router.use(protect)
router.get('/', wrap(c.list))
router.get('/summary', wrap(c.summary))
router.post('/upload', upload, wrap(c.upload))
router.post('/:id/ai-summary', summaryCooldown, summaryLimit, wrap(c.generateAiSummary))
router.post('/:id/results', wrap(c.addTestResult))
router.put('/:id/results/:resultId', wrap(c.updateTestResult))
router.delete('/:id/results/:resultId', wrap(c.removeTestResult))
router.get('/:id', wrap(c.getOne))
router.get('/:id/download', wrap(c.download))
router.delete('/:id', wrap(c.remove))
module.exports = router
