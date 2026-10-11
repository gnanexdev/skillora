import { apiRequest } from './authApi.js'

export const weeklyPlansApi = {
  list: (filters = {}) => {
    const query = new URLSearchParams(filters).toString()
    return apiRequest(`/api/weekly-plans${query ? `?${query}` : ''}`, { authenticated: true })
  },
  get: (id) => apiRequest(`/api/weekly-plans/${encodeURIComponent(id)}`, { authenticated: true }),
  current: () => apiRequest('/api/weekly-plans/current', { authenticated: true }),
  create: (values) => apiRequest('/api/weekly-plans', { method: 'POST', authenticated: true, body: JSON.stringify(values) }),
  update: (id, values) => apiRequest(`/api/weekly-plans/${encodeURIComponent(id)}`, { method: 'PATCH', authenticated: true, body: JSON.stringify(values) }),
  remove: (id) => apiRequest(`/api/weekly-plans/${encodeURIComponent(id)}`, { method: 'DELETE', authenticated: true }),
}

export default weeklyPlansApi
