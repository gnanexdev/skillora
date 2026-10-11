const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const TOKEN_STORAGE_KEY = 'skillora_access_token'

export async function apiRequest(path, { token, authenticated = false, ...options } = {}) {
  const requestToken = token || (authenticated ? localStorage.getItem(TOKEN_STORAGE_KEY) : null)
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(requestToken ? { Authorization: `Bearer ${requestToken}` } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new Error('Unable to reach SkillOra. Check your connection and try again.')
  }

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    if (response.status === 401 && requestToken) {
      localStorage.removeItem(TOKEN_STORAGE_KEY)
      window.dispatchEvent(new Event('skillora:unauthorized'))
    }
    const error = new Error(payload.message || 'Something went wrong. Please try again.')
    error.status = response.status
    throw error
  }
  return payload
}

export const authApi = {
  register: (details) => apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(details),
  }),
  login: (credentials) => apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),
  me: (token) => apiRequest('/api/auth/me', { token }),
}

export { API_BASE_URL }

export default authApi