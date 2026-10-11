import { listPlanningRecommendations, updatePlanningRecommendation } from '../services/planningRecommendationService.js'

export async function getPlanningRecommendations(request, response, next) {
  try {
    const recommendations = await listPlanningRecommendations(request.auth.userId, request.query)
    response.status(200).json({ success: true, recommendations })
  } catch (error) { next(error) }
}

export async function patchPlanningRecommendation(request, response, next) {
  try {
    const result = await updatePlanningRecommendation(request.auth.userId, request.params.id, request.body)
    response.status(200).json({ success: true, ...result })
  } catch (error) { next(error) }
}