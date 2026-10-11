import { createGoal, deleteGoal, getGoal, listGoals, updateGoal } from '../services/goalService.js'

export async function getGoals(request, response, next) {
  try {
    const goals = await listGoals(request.auth.userId, request.query)
    response.status(200).json({ success: true, goals })
  } catch (error) {
    next(error)
  }
}

export async function getGoalById(request, response, next) {
  try {
    const goal = await getGoal(request.auth.userId, request.params.id)
    response.status(200).json({ success: true, goal })
  } catch (error) {
    next(error)
  }
}

export async function postGoal(request, response, next) {
  try {
    const goal = await createGoal(request.auth.userId, request.body)
    response.status(201).json({ success: true, goal })
  } catch (error) {
    next(error)
  }
}

export async function patchGoal(request, response, next) {
  try {
    const goal = await updateGoal(request.auth.userId, request.params.id, request.body)
    response.status(200).json({ success: true, goal })
  } catch (error) {
    next(error)
  }
}

export async function removeGoal(request, response, next) {
  try {
    await deleteGoal(request.auth.userId, request.params.id)
    response.status(200).json({ success: true, message: 'Goal deleted' })
  } catch (error) {
    next(error)
  }
}