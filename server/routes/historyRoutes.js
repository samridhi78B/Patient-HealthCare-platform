const router = require('express').Router()
const controller = require('../controllers/historyController')
const { protect } = require('../middleware/authMiddleware')
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

router.use(protect)
router.get('/', wrap(controller.listMine))
router.post('/:id/review', wrap(controller.review))

module.exports = router
