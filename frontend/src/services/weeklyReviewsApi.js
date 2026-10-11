import { apiRequest } from './authApi.js'

export const weeklyReviewsApi = {
  get: (weekStartDate) => {
    const query = weekStartDate ? `?week_start_date=${encodeURIComponent(weekStartDate)}` : ''
    return apiRequest(`/api/weekly-reviews${query}`, { authenticated: true })
  },
  save: (values) => apiRequest('/api/weekly-reviews', {
    method: 'PUT',
    authenticated: true,
    body: JSON.stringify(values),
  }),
}

export default weeklyReviewsApi