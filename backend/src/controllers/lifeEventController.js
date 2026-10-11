import { createLifeEvent, deleteLifeEvent, getLifeEvent, listLifeEvents, updateLifeEvent } from '../services/lifeEventService.js'

export async function getLifeEvents(request, response, next) {
  try {
    const lifeEvents = await listLifeEvents(request.auth.userId, request.query)
    response.status(200).json({ success: true, lifeEvents })
  } catch (error) { next(error) }
}

export async function postLifeEvent(request, response, next) {
  try {
    const lifeEvent = await createLifeEvent(request.auth.userId, request.body)
    response.status(201).json({ success: true, lifeEvent })
  } catch (error) { next(error) }
}

export async function getLifeEventById(request, response, next) {
  try {
    const lifeEvent = await getLifeEvent(request.auth.userId, request.params.id)
    response.status(200).json({ success: true, lifeEvent })
  } catch (error) { next(error) }
}

export async function patchLifeEvent(request, response, next) {
  try {
    const lifeEvent = await updateLifeEvent(request.auth.userId, request.params.id, request.body)
    response.status(200).json({ success: true, lifeEvent })
  } catch (error) { next(error) }
}

export async function removeLifeEvent(request, response, next) {
  try {
    await deleteLifeEvent(request.auth.userId, request.params.id)
    response.status(200).json({ success: true, message: 'Life event deleted' })
  } catch (error) { next(error) }
}