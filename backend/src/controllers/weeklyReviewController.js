import { getWeeklyReview, saveWeeklyReview } from '../services/weeklyReviewService.js'

export async function getReview(request, response, next) {
  try {
    const review = await getWeeklyReview(request.auth.userId, request.query.week_start_date)
    response.status(200).json({ success: true, ...review })
  } catch (error) {
    next(error)
  }
}

export async function putReview(request, response, next) {
  try {
    const review = await saveWeeklyReview(request.auth.userId, request.body)
    response.status(200).json({ success: true, review })
  } catch (error) {
    next(error)
  }
}