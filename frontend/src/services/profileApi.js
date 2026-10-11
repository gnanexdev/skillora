import { apiRequest } from './authApi.js'

export const profileApi = {
  get: () => apiRequest('/api/auth/profile', { authenticated: true }),
  update: (values) => apiRequest('/api/auth/profile', {
    method: 'PATCH', authenticated: true, body: JSON.stringify(values),
  }),
}

export default profileApi