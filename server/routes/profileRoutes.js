const router = require('express').Router()
const c = require('../controllers/profileController')
const { protect } = require('../middleware/authMiddleware')
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

router.use(protect)
router.get('/', wrap(c.get))
router.put('/', wrap(c.update))

module.exports = router
