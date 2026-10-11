import { apiRequest } from './authApi.js'

export const roadmapApi = {
  forGoal: (goalId) => apiRequest(`/api/goals/${encodeURIComponent(goalId)}/roadmap`, { authenticated: true }),
  createForGoal: (goalId, values) => apiRequest(`/api/goals/${encodeURIComponent(goalId)}/roadmap`, {
    method: 'POST', authenticated: true, body: JSON.stringify(values),
  }),
  update: (roadmapId, values) => apiRequest(`/api/roadmaps/${encodeURIComponent(roadmapId)}`, {
    method: 'PATCH', authenticated: true, body: JSON.stringify(values),
  }),
  remove: (roadmapId) => apiRequest(`/api/roadmaps/${encodeURIComponent(roadmapId)}`, { method: 'DELETE', authenticated: true }),
  createMilestone: (roadmapId, values) => apiRequest(`/api/roadmaps/${encodeURIComponent(roadmapId)}/milestones`, {
    method: 'POST', authenticated: true, body: JSON.stringify(values),
  }),
  updateMilestone: (milestoneId, values) => apiRequest(`/api/milestones/${encodeURIComponent(milestoneId)}`, {
    method: 'PATCH', authenticated: true, body: JSON.stringify(values),
  }),
  removeMilestone: (milestoneId) => apiRequest(`/api/milestones/${encodeURIComponent(milestoneId)}`, { method: 'DELETE', authenticated: true }),
  createSkill: (milestoneId, values) => apiRequest(`/api/milestones/${encodeURIComponent(milestoneId)}/skills`, {
    method: 'POST', authenticated: true, body: JSON.stringify(values),
  }),
  updateSkill: (skillId, values) => apiRequest(`/api/skills/${encodeURIComponent(skillId)}`, {
    method: 'PATCH', authenticated: true, body: JSON.stringify(values),
  }),
  setSkillCompletion: (skillId, completed) => apiRequest(`/api/skills/${encodeURIComponent(skillId)}/completion`, {
    method: 'PATCH', authenticated: true, body: JSON.stringify({ completed }),
  }),
  removeSkill: (skillId) => apiRequest(`/api/skills/${encodeURIComponent(skillId)}`, { method: 'DELETE', authenticated: true }),
}

export default roadmapApi
