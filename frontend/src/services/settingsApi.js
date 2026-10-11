import { apiRequest } from './authApi.js'

export const settingsApi = {
  get: () => apiRequest('/api/auth/settings', { authenticated: true }),
  update: (values) => apiRequest('/api/auth/settings', {
    method: 'PATCH', authenticated: true, body: JSON.stringify(values),
  }),
}

export default settingsApi