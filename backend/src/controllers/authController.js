import { getUserProfile, getUserSettings, loginUser, registerUser, updateUserProfile, updateUserSettings } from '../services/authService.js'

export async function register(request, response, next) {
  try {
    const result = await registerUser(request.body ?? {})
    response.status(201).json({ success: true, ...result })
  } catch (error) {
    next(error)
  }
}

export async function login(request, response, next) {
  try {
    const result = await loginUser(request.body ?? {})
    response.status(200).json({ success: true, ...result })
  } catch (error) {
    next(error)
  }
}

export async function me(request, response, next) {
  try {
    const user = await getUserProfile(request.auth.userId)
    response.status(200).json({ success: true, user })
  } catch (error) {
    next(error)
  }
}

export async function profile(request, response, next) {
  try {
    const user = await getUserProfile(request.auth.userId)
    response.status(200).json({ success: true, user })
  } catch (error) {
    next(error)
  }
}

export async function patchProfile(request, response, next) {
  try {
    const user = await updateUserProfile(request.auth.userId, request.body)
    response.status(200).json({ success: true, user })
  } catch (error) {
    next(error)
  }
}

export async function getSettings(request, response, next) {
  try {
    const settings = await getUserSettings(request.auth.userId)
    response.status(200).json({ success: true, settings })
  } catch (error) {
    next(error)
  }
}

export async function patchSettings(request, response, next) {
  try {
    const settings = await updateUserSettings(request.auth.userId, request.body)
    response.status(200).json({ success: true, settings })
  } catch (error) {
    next(error)
  }
}