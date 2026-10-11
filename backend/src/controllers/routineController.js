import { createRoutine, deleteRoutine, getRoutine, listRoutines, setRoutineOccurrence, updateRoutine } from '../services/routineService.js'

export async function getRoutines(request, response, next) {
  try {
    const routines = await listRoutines(request.auth.userId, request.query)
    response.status(200).json({ success: true, routines })
  } catch (error) { next(error) }
}

export async function postRoutine(request, response, next) {
  try {
    const routine = await createRoutine(request.auth.userId, request.body)
    response.status(201).json({ success: true, routine })
  } catch (error) { next(error) }
}

export async function getRoutineById(request, response, next) {
  try {
    const routine = await getRoutine(request.auth.userId, request.params.id)
    response.status(200).json({ success: true, routine })
  } catch (error) { next(error) }
}

export async function patchRoutine(request, response, next) {
  try {
    const routine = await updateRoutine(request.auth.userId, request.params.id, request.body)
    response.status(200).json({ success: true, routine })
  } catch (error) { next(error) }
}

export async function removeRoutine(request, response, next) {
  try {
    await deleteRoutine(request.auth.userId, request.params.id)
    response.status(200).json({ success: true, message: 'Routine deleted' })
  } catch (error) { next(error) }
}

export async function patchRoutineOccurrence(request, response, next) {
  try {
    const occurrence = await setRoutineOccurrence(request.auth.userId, request.params.id, request.params.date, request.body?.completed)
    response.status(200).json({ success: true, occurrence })
  } catch (error) { next(error) }
}