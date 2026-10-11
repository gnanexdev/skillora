import { apiRequest } from './authApi.js'

export const tasksApi = {
  list: (filters = {}) => {
    const query = new URLSearchParams(filters).toString()
    return apiRequest(`/api/tasks${query ? `?${query}` : ''}`, { authenticated: true })
  },
  get: (id) => apiRequest(`/api/tasks/${encodeURIComponent(id)}`, { authenticated: true }),
  create: (values) => apiRequest('/api/tasks', { method: 'POST', authenticated: true, body: JSON.stringify(values) }),
  createForPlan: (planId, values) => apiRequest(`/api/weekly-plans/${encodeURIComponent(planId)}/tasks`, { method: 'POST', authenticated: true, body: JSON.stringify(values) }),
  update: (id, values) => apiRequest(`/api/tasks/${encodeURIComponent(id)}`, { method: 'PATCH', authenticated: true, body: JSON.stringify(values) }),
  remove: (id) => apiRequest(`/api/tasks/${encodeURIComponent(id)}`, { method: 'DELETE', authenticated: true }),
  listForPlan: (planId) => apiRequest(`/api/weekly-plans/${encodeURIComponent(planId)}/tasks`, { authenticated: true }),
}

export default tasksApi
