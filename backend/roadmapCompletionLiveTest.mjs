import 'dotenv/config'
import pg from 'pg'

const apiBase = process.env.API_BASE_URL || 'http://127.0.0.1:5000'
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')
const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
let ownerId
let otherId

async function request(path, options = {}, token = null) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  const body = await response.json().catch(() => ({}))
  return { response, body }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function createGoal(token, title) {
  const result = await request('/api/goals', { method: 'POST', body: JSON.stringify({ title }) }, token)
  assert(result.response.status === 201, `goal create returned ${result.response.status}`)
  return result.body.goal
}

async function createRoadmap(token, goalId) {
  const result = await request(`/api/goals/${goalId}/roadmap`, {
    method: 'POST', body: JSON.stringify({ title: 'Completion verification roadmap' }),
  }, token)
  assert(result.response.status === 201, `roadmap create returned ${result.response.status}`)
  return result.body.roadmap
}

async function createMilestone(token, roadmapId, title, position) {
  const result = await request(`/api/roadmaps/${roadmapId}/milestones`, {
    method: 'POST', body: JSON.stringify({ title, position }),
  }, token)
  assert(result.response.status === 201, `milestone create returned ${result.response.status}`)
  return result.body.milestone
}

async function createSkill(token, milestoneId, name, position) {
  const result = await request(`/api/milestones/${milestoneId}/skills`, {
    method: 'POST', body: JSON.stringify({ name, position }),
  }, token)
  assert(result.response.status === 201, `skill create returned ${result.response.status}`)
  return result.body.skill
}

async function setCompleted(token, skillId, completed) {
  const result = await request(`/api/skills/${skillId}/completion`, {
    method: 'PATCH', body: JSON.stringify({ completed }),
  }, token)
  assert(result.response.status === 200, `completion update returned ${result.response.status}: ${result.body.message || ''}`)
  return result.body.skill
}

async function readRoadmap(token, goalId) {
  const result = await request(`/api/goals/${goalId}/roadmap`, {}, token)
  assert(result.response.status === 200, `roadmap read returned ${result.response.status}`)
  return result.body.roadmap
}

async function readProgress(token, goalId) {
  const result = await request(`/api/goals/${goalId}/progress`, {}, token)
  assert(result.response.status === 200, `progress read returned ${result.response.status}`)
  return result.body
}

async function deleteTestUser(userId) {
  if (userId) await client.query('DELETE FROM public.users WHERE id = $1', [userId])
}

try {
  await client.connect()
  await client.query('SELECT 1')
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const owner = await request('/api/auth/register', {
    method: 'POST', body: JSON.stringify({ name: 'Roadmap Test', email: `roadmap-check-${unique}@example.invalid`, password: 'RoadmapCheck123!' }),
  })
  assert(owner.response.status === 201, `owner registration returned ${owner.response.status}`)
  ownerId = owner.body.user.id
  const ownerToken = owner.body.token
  const other = await request('/api/auth/register', {
    method: 'POST', body: JSON.stringify({ name: 'Roadmap Other', email: `roadmap-other-${unique}@example.invalid`, password: 'RoadmapCheck123!' }),
  })
  assert(other.response.status === 201, `other registration returned ${other.response.status}`)
  otherId = other.body.user.id
  const otherToken = other.body.token

  const goal = await createGoal(ownerToken, 'Completion-weighted roadmap')
  const roadmap = await createRoadmap(ownerToken, goal.id)
  const twoSkillMilestone = await createMilestone(ownerToken, roadmap.id, 'Two-skill step', 1)
  const oneSkillMilestone = await createMilestone(ownerToken, roadmap.id, 'One-skill step', 2)
  const emptyMilestone = await createMilestone(ownerToken, roadmap.id, 'Empty step', 3)
  const firstSkill = await createSkill(ownerToken, twoSkillMilestone.id, 'First skill', 1)
  const secondSkill = await createSkill(ownerToken, twoSkillMilestone.id, 'Second skill', 2)
  const thirdSkill = await createSkill(ownerToken, oneSkillMilestone.id, 'Third skill', 1)

  await client.query(`UPDATE public.skills SET progress_percentage = 100 WHERE id = ANY($1::uuid[])`, [[firstSkill.id, secondSkill.id, thirdSkill.id]])
  await client.query(`UPDATE public.milestones SET status = 'completed', progress_percentage = 100 WHERE roadmap_id = $1`, [roadmap.id])
  let calculatedRoadmap = await readRoadmap(ownerToken, goal.id)
  let calculatedProgress = await readProgress(ownerToken, goal.id)
  assert(calculatedRoadmap.progress_percentage === 0 && calculatedProgress.goal.progress === 0, 'stale manual progress values overrode derived completion')
  assert(calculatedRoadmap.milestones.every((milestone) => milestone.progress_percentage === 0 && milestone.status === 'pending'), 'stale milestone values overrode derived completion')

  const manualSkillUpdate = await request(`/api/skills/${firstSkill.id}`, {
    method: 'PATCH', body: JSON.stringify({ status: 'completed', progress_percentage: 100 }),
  }, ownerToken)
  assert(manualSkillUpdate.response.status === 400, 'generic skill update allowed manual completion/progress edits')
  const manualMilestoneUpdate = await request(`/api/milestones/${twoSkillMilestone.id}`, {
    method: 'PATCH', body: JSON.stringify({ status: 'completed', progress_percentage: 100 }),
  }, ownerToken)
  assert(manualMilestoneUpdate.response.status === 400, 'generic milestone update allowed manual completion/progress edits')

  await setCompleted(ownerToken, firstSkill.id, true)
  calculatedRoadmap = await readRoadmap(ownerToken, goal.id)
  calculatedProgress = await readProgress(ownerToken, goal.id)
  assert(calculatedRoadmap.milestones[0].progress_percentage === 50, 'one of two skills did not produce 50% milestone progress')
  assert(calculatedRoadmap.progress_percentage === 0 && calculatedProgress.goal.progress === 0, 'partial milestone incorrectly counted as completed roadmap progress')

  await setCompleted(ownerToken, secondSkill.id, true)
  calculatedRoadmap = await readRoadmap(ownerToken, goal.id)
  calculatedProgress = await readProgress(ownerToken, goal.id)
  assert(calculatedRoadmap.milestones[0].progress_percentage === 100 && calculatedRoadmap.milestones[0].status === 'completed', 'all checked skills did not complete milestone')
  assert(calculatedRoadmap.progress_percentage === 33 && calculatedProgress.goal.progress === 33, 'one of three milestones did not produce one-third roadmap progress')

  await setCompleted(ownerToken, thirdSkill.id, true)
  calculatedRoadmap = await readRoadmap(ownerToken, goal.id)
  assert(calculatedRoadmap.progress_percentage === 67, 'two completed milestones were not equally weighted across three milestones')
  await setCompleted(ownerToken, firstSkill.id, false)
  calculatedRoadmap = await readRoadmap(ownerToken, goal.id)
  calculatedProgress = await readProgress(ownerToken, goal.id)
  assert(calculatedRoadmap.milestones[0].progress_percentage === 50 && calculatedRoadmap.milestones[0].status === 'active', 'unchecking a skill did not recalculate its milestone')
  assert(calculatedRoadmap.progress_percentage === 33 && calculatedProgress.goal.progress === 33, 'unchecking a skill did not recalculate roadmap progress')

  const crossUser = await request(`/api/skills/${firstSkill.id}/completion`, {
    method: 'PATCH', body: JSON.stringify({ completed: true }),
  }, otherToken)
  assert(crossUser.response.status === 404, `cross-user skill completion returned ${crossUser.response.status}`)
  const emptyGoal = await createGoal(ownerToken, 'Empty roadmap goal')
  const emptyProgress = await readProgress(ownerToken, emptyGoal.id)
  assert(emptyProgress.goal.progress === 0 && emptyProgress.goal.hasEvidence === false, 'empty roadmap was reported complete or as having evidence')
  const emptyRoadmap = await createRoadmap(ownerToken, emptyGoal.id)
  const emptyRoadmapRead = await readRoadmap(ownerToken, emptyGoal.id)
  assert(emptyRoadmapRead.progress_percentage === 0 && emptyRoadmapRead.milestones.length === 0, 'roadmap with no milestones was not safely zero')

  console.log(JSON.stringify({
    result: 'passed',
    skillCompletionPersistsAndCanBeReversed: true,
    milestoneProgressExamples: [0, 50, 100],
    roadmapProgressExamples: [0, 33, 67],
    staleManualProgressIgnored: true,
    genericManualProgressEditsRejected: true,
    emptyMilestoneAndRoadmapSafe: true,
    progressEngineMatchesRoadmapRead: true,
    crossUserCompletionBlocked: true,
  }, null, 2))
} finally {
  try {
    await deleteTestUser(ownerId)
    await deleteTestUser(otherId)
    if (ownerId || otherId) console.log('Temporary roadmap test accounts and dependent records deleted.')
  } finally {
    await client.end().catch(() => {})
  }
}