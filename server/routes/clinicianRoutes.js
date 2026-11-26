const router = require('express').Router()
const rateLimit = require('express-rate-limit')
const controller = require('../controllers/clinicianController')
const emergencyController = require('../controllers/emergencyController')
const { requireClinician } = require('../middleware/auth')
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

const signInLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 'RATE_LIMITED', message: 'Too many clinician sign-in attempts. Try again later.' },
})

router.post('/register', signInLimit, wrap(controller.register))
router.post('/login', signInLimit, wrap(controller.login))
router.post('/logout', wrap(controller.logout))
router.get('/me', requireClinician, wrap(controller.me))
router.put('/profile', requireClinician, wrap(controller.updateProfile))
router.post('/profile/password', requireClinician, wrap(controller.changePassword))
router.get('/access-history', requireClinician, wrap(emergencyController.patientAccessHistory))
router.post('/patients/:patientId/qr/revoke', requireClinician, wrap(emergencyController.revokePatientQr))

module.exports = router
