const router = require('express').Router()
const rateLimit = require('express-rate-limit')
const controller = require('../controllers/emergencyController')
const { requireClinician } = require('../middleware/auth')
const { requireEmergencySession } = require('../middleware/emergencyAccess')
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
const accessLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many emergency access attempts. Try again later.' },
})

router.post('/open', accessLimit, requireClinician, wrap(controller.open))
router.use('/session', requireClinician, requireEmergencySession)
router.get('/session/summary', wrap(controller.summary))
router.post('/session/close', wrap(controller.closeSession))
router.get('/session/records', wrap(controller.records))
router.get('/session/reports/:reportId/download', wrap(controller.downloadReport))
router.post('/session/history/:itemId/verify', wrap(controller.verifyHistoryItem))
router.post('/session/history', wrap(controller.addHistoryItem))

module.exports = router
