export function notFound(_req, res) {
  return res.status(404).json({ message: 'Route not found.' })
}

export function errorHandler(error, _req, res, _next) {
  if (error?.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Request body contains invalid JSON.' })
  }

  if (error?.name === 'ValidationError') {
    return res.status(400).json({ message: 'Request validation failed.' })
  }

  if (error?.code === 11000) {
    return res.status(409).json({ message: 'A record with that value already exists.' })
  }

  if (error?.message === 'Origin is not allowed by CORS.') {
    return res.status(403).json({ message: 'Origin is not allowed.' })
  }

  console.error('Unhandled API error:', error)
  return res.status(500).json({ message: 'Internal server error.' })
}
