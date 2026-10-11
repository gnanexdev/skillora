import { apiRequest } from './authApi.js'

export const goalsApi = {
  list: (filters = {}) => {
    const query = new URLSearchParams(filters).toString()
    return apiRequest(`/api/goals${query ? `?${query}` : ''}`, { authenticated: true })
  },
  get: (id) => apiRequest(`/api/goals/${encodeURIComponent(id)}`, { authenticated: true }),
  create: (goal) => apiRequest('/api/goals', {
    method: 'POST',
    authenticated: true,
    body: JSON.stringify(goal),
  }),
  update: (id, changes) => apiRequest(`/api/goals/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    authenticated: true,
    body: JSON.stringify(changes),
  }),
  remove: (id) => apiRequest(`/api/goals/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    authenticated: true,
  }),
  health: (id) => apiRequest(`/api/goals/${encodeURIComponent(id)}/health`, { authenticated: true }),
}

export default goalsApi
