import { apiRequest } from './authApi.js'

export const achievementsApi = {
  list: () => apiRequest('/api/achievements', { authenticated: true }),
  get: (id) => apiRequest(`/api/achievements/${encodeURIComponent(id)}`, { authenticated: true }),
}

export default achievementsApi