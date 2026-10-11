import { getAchievement, listAchievements } from '../services/achievementService.js'

export async function getAchievements(request, response, next) {
  try {
    const achievements = await listAchievements(request.auth.userId)
    response.status(200).json({ success: true, achievements })
  } catch (error) {
    next(error)
  }
}

export async function getAchievementById(request, response, next) {
  try {
    const achievement = await getAchievement(request.auth.userId, request.params.id)
    response.status(200).json({ success: true, achievement })
  } catch (error) {
    next(error)
  }
}