import { apiRequest } from './authApi.js'

export const progressApi = {
  forGoal: (goalId) => apiRequest(`/api/goals/${encodeURIComponent(goalId)}/progress`, { authenticated: true }),
}

export default progressApi