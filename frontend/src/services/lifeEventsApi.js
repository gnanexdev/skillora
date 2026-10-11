import { apiRequest } from './authApi.js'

export const lifeEventsApi = {
  list: (filters = {}) => {
    const query = new URLSearchParams(filters).toString()
    return apiRequest(`/api/life-events${query ? `?${query}` : ''}`, { authenticated: true })
  },
  create: (values) => apiRequest('/api/life-events', { method: 'POST', authenticated: true, body: JSON.stringify(values) }),
  update: (id, values) => apiRequest(`/api/life-events/${encodeURIComponent(id)}`, { method: 'PATCH', authenticated: true, body: JSON.stringify(values) }),
  remove: (id) => apiRequest(`/api/life-events/${encodeURIComponent(id)}`, { method: 'DELETE', authenticated: true }),
}

export default lifeEventsApi