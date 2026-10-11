import { apiRequest } from './authApi.js'

export const routinesApi = {
  list: (filters = {}) => {
    const query = new URLSearchParams(filters).toString()
    return apiRequest(`/api/routines${query ? `?${query}` : ''}`, { authenticated: true })
  },
  create: (values) => apiRequest('/api/routines', { method: 'POST', authenticated: true, body: JSON.stringify(values) }),
  update: (id, values) => apiRequest(`/api/routines/${encodeURIComponent(id)}`, { method: 'PATCH', authenticated: true, body: JSON.stringify(values) }),
  remove: (id) => apiRequest(`/api/routines/${encodeURIComponent(id)}`, { method: 'DELETE', authenticated: true }),
  setOccurrence: (id, date, completed) => apiRequest(`/api/routines/${encodeURIComponent(id)}/occurrences/${encodeURIComponent(date)}`, {
    method: 'PATCH', authenticated: true, body: JSON.stringify({ completed }),
  }),
}

export default routinesApi