import { apiRequest } from './authApi.js'

export const planningSuggestionsApi = {
  list: (filters = {}) => {
    const query = new URLSearchParams(filters).toString()
    return apiRequest(`/api/planning-suggestions${query ? `?${query}` : ''}`, { authenticated: true })
  },
  update: (id, values) => apiRequest(`/api/planning-suggestions/${encodeURIComponent(id)}`, {
    method: 'PATCH', authenticated: true, body: JSON.stringify(values),
  }),
}

export default planningSuggestionsApi