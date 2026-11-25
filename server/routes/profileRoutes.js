const router = require('express').Router()
const c = require('../controllers/profileController')
const { protect } = require('../middleware/authMiddleware')
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

router.use(protect)
router.get('/', wrap(c.get))
router.put('/', wrap(c.update))
router.get('/emergency-qr', wrap(c.getQr))
router.post('/emergency-qr/regenerate', wrap(c.regenerateQr))
router.delete('/emergency-qr', wrap(c.revokeQr))

module.exports = router
