import { checkDatabaseHealth } from '../services/healthService.js'

export function getHealth(_request, response) {
  response.status(200).json({
    success: true,
    message: 'SkillOra API is running',
  })
}

export async function getDatabaseHealth(_request, response, next) {
  try {
    const connected = await checkDatabaseHealth()
    response.status(200).json({
      success: connected,
      message: connected ? 'PostgreSQL connection is healthy' : 'PostgreSQL connection failed',
    })
  } catch (error) {
    console.error(`PostgreSQL health check failed: ${error.message}`)
    response.status(503).json({
      success: false,
      message: 'PostgreSQL connection is unavailable',
    })
  }
}
