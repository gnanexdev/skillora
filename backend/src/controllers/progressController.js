import { getGoalProgress } from '../services/progressService.js'

export async function getProgressForGoal(request, response, next) {
  try {
    const progress = await getGoalProgress(request.auth.userId, request.params.goalId)
    response.status(200).json({ success: true, ...progress })
  } catch (error) {
    next(error)
  }
}