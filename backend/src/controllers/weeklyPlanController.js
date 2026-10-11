import {
  createWeeklyPlan,
  deleteWeeklyPlan,
  getCurrentWeek,
  getWeeklyPlan,
  listWeeklyPlans,
  updateWeeklyPlan,
} from '../services/weeklyPlanService.js'

export async function getWeeklyPlans(request, response, next) {
  try {
    const weeklyPlans = await listWeeklyPlans(request.auth.userId, request.query)
    response.status(200).json({ success: true, weeklyPlans })
  } catch (error) {
    next(error)
  }
}

export async function getWeeklyPlanById(request, response, next) {
  try {
    const weeklyPlan = await getWeeklyPlan(request.auth.userId, request.params.id)
    response.status(200).json({ success: true, weeklyPlan })
  } catch (error) {
    next(error)
  }
}

export async function getCurrentWeeklyPlan(request, response, next) {
  try {
    const current = await getCurrentWeek(request.auth.userId)
    response.status(200).json({ success: true, ...current })
  } catch (error) {
    next(error)
  }
}

export async function postWeeklyPlan(request, response, next) {
  try {
    const weeklyPlan = await createWeeklyPlan(request.auth.userId, request.body)
    response.status(201).json({ success: true, weeklyPlan })
  } catch (error) {
    next(error)
  }
}

export async function patchWeeklyPlan(request, response, next) {
  try {
    const weeklyPlan = await updateWeeklyPlan(request.auth.userId, request.params.id, request.body)
    response.status(200).json({ success: true, weeklyPlan })
  } catch (error) {
    next(error)
  }
}

export async function removeWeeklyPlan(request, response, next) {
  try {
    await deleteWeeklyPlan(request.auth.userId, request.params.id)
    response.status(200).json({ success: true, message: 'Weekly plan deleted' })
  } catch (error) {
    next(error)
  }
}