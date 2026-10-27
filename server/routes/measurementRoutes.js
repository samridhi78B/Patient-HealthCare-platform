const router = require('express').Router()
const controller = require('../controllers/measurementController')
const { protect } = require('../middleware/authMiddleware')
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

router.use(protect)
router.get('/', wrap(controller.list))
router.post('/', wrap(controller.create))
router.put('/:id', wrap(controller.update))
router.delete('/:id', wrap(controller.remove))

module.exports = router
