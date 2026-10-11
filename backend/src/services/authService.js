import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { pool } from '../config/database.js'

const SAFE_USER_COLUMNS = `id, name, email, avatar_url, timezone,
  college_or_university, degree, department, study_year,
  professional_role, organization, career_interests, bio, created_at, updated_at`
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_MIN_LENGTH = 8
const PASSWORD_MAX_BYTES = 72

export class AuthServiceError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'AuthServiceError'
    this.status = status
  }
}

function requireJwtSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) {
    throw new AuthServiceError('Authentication is not configured', 500)
  }
  return secret
}

export function normalizeEmail(email) {
  return email.trim().toLowerCase()
}

export function isValidEmail(email) {
  return email.length <= 254 && EMAIL_PATTERN.test(email)
}

export function validateRegistration({ name, email, password }) {
  if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
    throw new AuthServiceError('Name, email, and password are required', 400)
  }

  const cleanName = name.trim()
  const cleanEmail = normalizeEmail(email)
  if (!cleanName || cleanName.length > 100) {
    throw new AuthServiceError('Name is required and must be 100 characters or fewer', 400)
  }
  if (!isValidEmail(cleanEmail)) {
    throw new AuthServiceError('A valid email address is required', 400)
  }
  if (password.length < PASSWORD_MIN_LENGTH || Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES) {
    throw new AuthServiceError('Password must be at least 8 characters and no more than 72 bytes', 400)
  }

  return { name: cleanName, email: cleanEmail, password }
}

function createToken(userId, secret) {
  return jwt.sign({}, secret, {
    algorithm: 'HS256',
    subject: userId,
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  })
}

export function verifyAccessToken(token) {
  return jwt.verify(token, requireJwtSecret(), { algorithms: ['HS256'] })
}

export async function registerUser(input) {
  const jwtSecret = requireJwtSecret()
  const { name, email, password } = validateRegistration(input)
  const existingUser = await pool.query('SELECT id FROM public.users WHERE email = $1 LIMIT 1', [email])
  if (existingUser.rowCount) {
    throw new AuthServiceError('An account with this email already exists', 409)
  }

  const passwordHash = await bcrypt.hash(password, 12)
  try {
    const result = await pool.query(
      `INSERT INTO public.users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING ${SAFE_USER_COLUMNS}`,
      [name, email, passwordHash],
    )
    const user = result.rows[0]
    return { user, token: createToken(user.id, jwtSecret) }
  } catch (error) {
    if (error.code === '23505') {
      throw new AuthServiceError('An account with this email already exists', 409)
    }
    throw error
  }
}

export async function loginUser({ email, password }) {
  const jwtSecret = requireJwtSecret()
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    throw new AuthServiceError('Email and password are required', 400)
  }

  const cleanEmail = normalizeEmail(email)
  if (!isValidEmail(cleanEmail)) {
    throw new AuthServiceError('Invalid email or password', 401)
  }

  const result = await pool.query(
    `SELECT ${SAFE_USER_COLUMNS}, password_hash
     FROM public.users
     WHERE email = $1
     LIMIT 1`,
    [cleanEmail],
  )
  const row = result.rows[0]
  const passwordMatches = row
    ? await bcrypt.compare(password, row.password_hash)
    : await bcrypt.compare(password, '$2b$12$C6UzMDM.H6dfI/f/IKcEe.4hYf9u0XWc1I1AP6aJbX8xYv6M9A5mK')

  if (!row || !passwordMatches) {
    throw new AuthServiceError('Invalid email or password', 401)
  }

  const { password_hash: _passwordHash, ...user } = row
  return { user, token: createToken(user.id, jwtSecret) }
}

export async function getUserProfile(userId) {
  const result = await pool.query(
    `SELECT ${SAFE_USER_COLUMNS}
     FROM public.users
     WHERE id = $1
     LIMIT 1`,
    [userId],
  )
  if (!result.rowCount) {
    throw new AuthServiceError('Authentication required', 401)
  }
  return result.rows[0]
}

const PROFILE_FIELDS = {
  name: 100,
  avatar_url: 2048,
  college_or_university: 180,
  degree: 140,
  department: 140,
  study_year: 80,
  professional_role: 140,
  organization: 180,
  career_interests: 500,
  bio: 1200,
}

export async function updateUserProfile(userId, input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AuthServiceError('Request body must be an object', 400)
  }
  const unknown = Object.keys(input).find((field) => !Object.hasOwn(PROFILE_FIELDS, field))
  if (unknown) throw new AuthServiceError(`Field ${unknown} cannot be changed`, 400)
  const updates = Object.entries(input).map(([field, maximum]) => {
    const value = input[field]
    if (value === null && field !== 'name') return [field, null]
    if (typeof value !== 'string') throw new AuthServiceError(`${field} must be a string`, 400)
    const clean = value.trim()
    if (clean.length > maximum) throw new AuthServiceError(`${field} must be ${maximum} characters or fewer`, 400)
    if (field === 'name' && !clean) throw new AuthServiceError('Name is required', 400)
    return [field, clean || null]
  })
  if (!updates.length) throw new AuthServiceError('At least one editable field is required', 400)

  const assignments = updates.map(([field], index) => `${field} = $${index + 2}`)
  const result = await pool.query(
    `UPDATE public.users
     SET ${assignments.join(', ')}, updated_at = NOW()
     WHERE id = $1
     RETURNING ${SAFE_USER_COLUMNS}`,
    [userId, ...updates.map(([, value]) => value)],
  )
  if (!result.rowCount) throw new AuthServiceError('Authentication required', 401)
  return result.rows[0]
}

function validateTimezone(value) {
  if (typeof value !== 'string' || value.length > 100) {
    throw new AuthServiceError('timezone must be a valid IANA timezone', 400)
  }
  try {
    new Intl.DateTimeFormat('en', { timeZone: value })
  } catch {
    throw new AuthServiceError('timezone must be a valid IANA timezone', 400)
  }
  return value
}

function validateSettings(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AuthServiceError('Request body must be an object', 400)
  }
  const allowed = new Set(['theme', 'week_starts_on', 'notifications_enabled', 'timezone'])
  const unknown = Object.keys(input).find((field) => !allowed.has(field))
  if (unknown) throw new AuthServiceError(`Field ${unknown} cannot be changed`, 400)
  if (!Object.keys(input).length) throw new AuthServiceError('At least one setting is required', 400)
  const result = {}
  if (Object.hasOwn(input, 'theme')) {
    if (!['light', 'dark', 'system'].includes(input.theme)) throw new AuthServiceError('theme must be light, dark, or system', 400)
    result.theme = input.theme
  }
  if (Object.hasOwn(input, 'week_starts_on')) {
    const value = Number(input.week_starts_on)
    if (!Number.isInteger(value) || value < 0 || value > 6) throw new AuthServiceError('week_starts_on must be a day from 0 through 6', 400)
    result.week_starts_on = value
  }
  if (Object.hasOwn(input, 'notifications_enabled')) {
    if (typeof input.notifications_enabled !== 'boolean') throw new AuthServiceError('notifications_enabled must be a boolean', 400)
    result.notifications_enabled = input.notifications_enabled
  }
  if (Object.hasOwn(input, 'timezone')) result.timezone = validateTimezone(input.timezone)
  return result
}

export async function getUserSettings(userId) {
  const result = await pool.query(
    `SELECT COALESCE(settings.theme, 'system') AS theme,
       COALESCE(settings.week_starts_on, 1)::int AS week_starts_on,
       COALESCE(settings.notifications_enabled, true) AS notifications_enabled,
       users.timezone
     FROM public.users
     LEFT JOIN public.user_settings AS settings ON settings.user_id = users.id
     WHERE users.id = $1
     LIMIT 1`,
    [userId],
  )
  if (!result.rowCount) throw new AuthServiceError('Authentication required', 401)
  return result.rows[0]
}

export async function updateUserSettings(userId, input) {
  const updates = validateSettings(input)
  const current = await getUserSettings(userId)
  const merged = { ...current, ...updates }
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const userResult = await client.query(
      `UPDATE public.users SET timezone = $2, updated_at = NOW() WHERE id = $1 RETURNING id`,
      [userId, merged.timezone],
    )
    if (!userResult.rowCount) throw new AuthServiceError('Authentication required', 401)
    await client.query(
      `INSERT INTO public.user_settings (user_id, theme, week_starts_on, notifications_enabled)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE SET
         theme = EXCLUDED.theme,
         week_starts_on = EXCLUDED.week_starts_on,
         notifications_enabled = EXCLUDED.notifications_enabled,
         updated_at = NOW()`,
      [userId, merged.theme, merged.week_starts_on, merged.notifications_enabled],
    )
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
  }
  return getUserSettings(userId)
}