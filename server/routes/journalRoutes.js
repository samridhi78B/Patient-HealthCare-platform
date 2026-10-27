const router = require('express').Router()
const c = require('../controllers/journalController')
const { protect } = require('../middleware/authMiddleware')
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

router.use(protect)
router.get('/trends', wrap(c.trends))
router.get('/export', wrap(c.exportHistory))
router.get('/appointments', wrap(c.appointments))
router.get('/', wrap(c.list))
router.post('/', wrap(c.create))
router.put('/:id', wrap(c.update))
router.delete('/:id', wrap(c.remove))

module.exports = router
