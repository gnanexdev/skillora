import {
  createTask,
  deleteTask,
  getTask,
  listTasks,
  listWeeklyPlanTasks,
  updateTask,
} from '../services/taskService.js'

export async function getTasks(request, response, next) {
  try {
    const tasks = await listTasks(request.auth.userId, request.query)
    response.status(200).json({ success: true, tasks })
  } catch (error) {
    next(error)
  }
}

export async function getTaskById(request, response, next) {
  try {
    const task = await getTask(request.auth.userId, request.params.id)
    response.status(200).json({ success: true, task })
  } catch (error) {
    next(error)
  }
}

export async function postTask(request, response, next) {
  try {
    const task = await createTask(request.auth.userId, request.body)
    response.status(201).json({ success: true, task })
  } catch (error) {
    next(error)
  }
}

export async function patchTask(request, response, next) {
  try {
    const task = await updateTask(request.auth.userId, request.params.id, request.body)
    response.status(200).json({ success: true, task })
  } catch (error) {
    next(error)
  }
}

export async function removeTask(request, response, next) {
  try {
    await deleteTask(request.auth.userId, request.params.id)
    response.status(200).json({ success: true, message: 'Task deleted' })
  } catch (error) {
    next(error)
  }
}

export async function getTasksForPlan(request, response, next) {
  try {
    const tasks = await listWeeklyPlanTasks(request.auth.userId, request.params.weeklyPlanId)
    response.status(200).json({ success: true, tasks })
  } catch (error) {
    next(error)
  }
}

export async function postTaskForPlan(request, response, next) {
  try {
    const task = await createTask(request.auth.userId, { ...request.body, weekly_plan_id: request.params.weeklyPlanId })
    response.status(201).json({ success: true, task })
  } catch (error) {
    next(error)
  }
}