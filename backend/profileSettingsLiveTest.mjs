import 'dotenv/config'
import pg from 'pg'

const apiBase = process.env.API_BASE_URL || 'http://127.0.0.1:5000'
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')
const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
let ownerId
let otherId

async function request(path, options = {}, token = null) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  const body = await response.json().catch(() => ({}))
  return { response, body }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function deleteTestUser(userId) {
  if (userId) await client.query('DELETE FROM public.users WHERE id = $1', [userId])
}

try {
  await client.connect()
  await client.query('SELECT 1')
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const ownerRegistration = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Profile Test', email: `profile-details-${unique}@example.invalid`, password: 'ProfileDetails123!' }),
  })
  assert(ownerRegistration.response.status === 201, `owner registration returned ${ownerRegistration.response.status}`)
  ownerId = ownerRegistration.body.user.id
  const ownerToken = ownerRegistration.body.token

  const otherRegistration = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Profile Other', email: `profile-other-${unique}@example.invalid`, password: 'ProfileDetails123!' }),
  })
  assert(otherRegistration.response.status === 201, `other registration returned ${otherRegistration.response.status}`)
  otherId = otherRegistration.body.user.id
  const otherToken = otherRegistration.body.token

  const initialProfile = await request('/api/auth/profile', {}, ownerToken)
  assert(initialProfile.response.status === 200, `profile GET returned ${initialProfile.response.status}`)
  assert(initialProfile.body.user.email === `profile-details-${unique}@example.invalid`, 'profile did not retain the registered email')
  const details = {
    name: 'Updated Profile Name',
    avatar_url: 'https://example.invalid/avatar.png',
    college_or_university: 'Example University',
    degree: 'BSc Computing',
    department: 'Computer Science',
    study_year: 'Year 3',
    professional_role: 'Research Assistant',
    organization: 'Example Lab',
    career_interests: 'Accessible systems, data tools',
    bio: 'I enjoy building useful software.',
  }
  const savedProfile = await request('/api/auth/profile', {
    method: 'PATCH', body: JSON.stringify(details),
  }, ownerToken)
  assert(savedProfile.response.status === 200, `profile update returned ${savedProfile.response.status}`)
  assert(savedProfile.body.user.name === details.name && savedProfile.body.user.avatar_url === details.avatar_url, 'profile name/avatar were not updated')
  for (const field of Object.keys(details).filter((field) => !['name', 'avatar_url'].includes(field))) {
    assert(savedProfile.body.user[field] === details[field], `${field} was not saved`)
  }
  const reloadedProfile = await request('/api/auth/profile', {}, ownerToken)
  assert(reloadedProfile.body.user.bio === details.bio, 'profile details did not persist across reads')
  assert(reloadedProfile.body.user.email === initialProfile.body.user.email, 'profile update changed the account email')
  const forbiddenProfile = await request('/api/auth/profile', {
    method: 'PATCH', body: JSON.stringify({ user_id: otherId, name: 'Cross-user attempt' }),
  }, ownerToken)
  assert(forbiddenProfile.response.status === 400, 'profile update accepted a client-supplied user identifier')
  const otherProfile = await request('/api/auth/profile', {}, otherToken)
  assert(otherProfile.body.user.name === 'Profile Other', 'another user could read the owner profile')

  const initialSettings = await request('/api/auth/settings', {}, ownerToken)
  assert(initialSettings.response.status === 200, `settings GET returned ${initialSettings.response.status}`)
  const preferenceUpdate = {
    theme: 'dark',
    week_starts_on: 0,
    notifications_enabled: false,
    timezone: 'Pacific/Kiritimati',
  }
  const savedSettings = await request('/api/auth/settings', {
    method: 'PATCH', body: JSON.stringify(preferenceUpdate),
  }, ownerToken)
  assert(savedSettings.response.status === 200, `settings update returned ${savedSettings.response.status}: ${savedSettings.body.message || ''}`)
  assert(JSON.stringify(savedSettings.body.settings) === JSON.stringify(preferenceUpdate), 'settings response does not reflect persisted preferences')
  const reloadedSettings = await request('/api/auth/settings', {}, ownerToken)
  for (const field of Object.keys(preferenceUpdate)) assert(reloadedSettings.body.settings[field] === preferenceUpdate[field], `${field} did not persist`)
  const invalidTimezone = await request('/api/auth/settings', {
    method: 'PATCH', body: JSON.stringify({ timezone: 'Not/A_Real_Zone' }),
  }, ownerToken)
  assert(invalidTimezone.response.status === 400, `invalid timezone returned ${invalidTimezone.response.status}`)
  const otherSettings = await request('/api/auth/settings', {}, otherToken)
  assert(otherSettings.body.settings.theme !== 'dark' || otherSettings.body.settings.timezone !== 'Pacific/Kiritimati', 'settings leaked across users')
  const unauthenticated = await request('/api/auth/profile')
  assert(unauthenticated.response.status === 401, 'unauthenticated profile read was accepted')

  console.log(JSON.stringify({
    result: 'passed',
    optionalProfileFieldsPersisted: true,
    avatarPreservedAndEmailUnchanged: true,
    settingsPersisted: Object.keys(preferenceUpdate),
    invalidTimezoneRejected: true,
    crossUserIsolationVerified: true,
    unauthenticatedAccessRejected: true,
  }, null, 2))
} finally {
  try {
    await deleteTestUser(ownerId)
    await deleteTestUser(otherId)
    if (ownerId || otherId) console.log('Temporary profile/settings accounts and dependent records deleted.')
  } finally {
    await client.end().catch(() => {})
  }
}