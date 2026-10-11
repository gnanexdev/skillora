import { getGoalHealth } from '../services/goalHealthService.js'

export async function getGoalHealthById(request, response, next) {
  try {
    const result = await getGoalHealth(request.auth.userId, request.params.goalId)
    response.status(200).json({ success: true, ...result })
  } catch (error) {
    next(error)
  }
}
