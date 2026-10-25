const router = require('express').Router()
const c = require('../controllers/appointmentController')
const { protect } = require('../middleware/authMiddleware')
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

router.use(protect)
router.get('/hospitals', wrap(c.hospitals))
router.get('/hospitals/:hospitalId/doctors', wrap(c.doctors))
router.get('/doctors/:doctorId/availability', wrap(c.availability))
router.get('/appointments', wrap(c.list))
router.post('/appointments', wrap(c.create))
router.post('/appointments/:id/cancel', wrap(c.cancel))
router.post('/appointments/:id/reschedule', wrap(c.reschedule))

module.exports = router
