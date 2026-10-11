import { verifyAccessToken } from '../services/authService.js'

export function authenticate(request, response, next) {
  const authorization = request.get('authorization')
  const match = authorization?.match(/^Bearer\s+([^\s]+)$/i)
  if (!match) {
    response.status(401).json({ success: false, message: 'Authentication required' })
    return
  }

  try {
    const payload = verifyAccessToken(match[1])
    if (typeof payload === 'string' || typeof payload.sub !== 'string') {
      response.status(401).json({ success: false, message: 'Invalid or expired token' })
      return
    }
    request.auth = { userId: payload.sub }
    next()
  } catch (error) {
    if (error.status === 500) {
      next(error)
      return
    }
    response.status(401).json({ success: false, message: 'Invalid or expired token' })
  }
}