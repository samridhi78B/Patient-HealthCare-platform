const COOLDOWN_MS = 5000
const requests = new Map()

module.exports = (req, res, next) => {
  const key = `${req.user._id}:${req.params.id}`
  if (requests.has(key)) {
    const message = 'A summary request is already in progress or was just completed. Wait 5 seconds before retrying.'
    return res.status(429).json({ error: message, message })
  }

  const entry = {}
  requests.set(key, entry)
  let released = false
  const release = () => {
    if (released) return
    released = true
    const timer = setTimeout(() => {
      if (requests.get(key) === entry) requests.delete(key)
    }, COOLDOWN_MS)
    timer.unref()
  }
  res.once('finish', release)
  res.once('close', release)
  next()
}
