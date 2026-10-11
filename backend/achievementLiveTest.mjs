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

function dateAtNoon(date, offset) {
  const value = new Date(`${date}T12:00:00.000Z`)
  value.setUTCDate(value.getUTCDate() + offset)
  return value.toISOString()
}

async function createGoal(token, title) {
  const result = await request('/api/goals', {
    method: 'POST', body: JSON.stringify({ title, priority: 'medium' }),
  }, token)
  assert(result.response.status === 201, `goal creation returned ${result.response.status}`)
  return result.body.goal
}

async function createRoadmap(token, goalId) {
  const result = await request(`/api/goals/${goalId}/roadmap`, {
    method: 'POST', body: JSON.stringify({ title: 'Achievement verification roadmap' }),
  }, token)
  assert(result.response.status === 201, `roadmap creation returned ${result.response.status}`)
  return result.body.roadmap
}

async function createMilestone(token, roadmapId, title) {
  const result = await request(`/api/roadmaps/${roadmapId}/milestones`, {
    method: 'POST', body: JSON.stringify({ title, position: 1 }),
  }, token)
  assert(result.response.status === 201, `milestone creation returned ${result.response.status}`)
  return result.body.milestone
}

async function createSkill(token, milestoneId, name) {
  const result = await request(`/api/milestones/${milestoneId}/skills`, {
    method: 'POST', body: JSON.stringify({ name, position: 1 }),
  }, token)
  assert(result.response.status === 201, `skill creation returned ${result.response.status}`)
  return result.body.skill
}

async function createTask(token, title, options = {}) {
  const result = await request('/api/tasks', {
    method: 'POST', body: JSON.stringify({ title, ...options }),
  }, token)
  assert(result.response.status === 201, `task creation returned ${result.response.status}`)
  return result.body.task
}

async function completeTask(token, taskId) {
  const result = await request(`/api/tasks/${taskId}`, {
    method: 'PATCH', body: JSON.stringify({ status: 'completed' }),
  }, token)
  assert(result.response.status === 200, `task completion returned ${result.response.status}`)
  return result.body.task
}

async function deleteTestUser(userId) {
  if (userId) await client.query('DELETE FROM public.users WHERE id = $1', [userId])
}

try {
  await client.connect()
  await client.query('SELECT 1')
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const ownerRegistration = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Achievement Test', email: `achievement-${unique}@example.invalid`, password: 'AchievementTest123!' }),
  })
  assert(ownerRegistration.response.status === 201, `owner registration returned ${ownerRegistration.response.status}`)
  ownerId = ownerRegistration.body.user.id
  const ownerToken = ownerRegistration.body.token

  const otherRegistration = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Achievement Other', email: `achievement-other-${unique}@example.invalid`, password: 'AchievementTest123!' }),
  })
  assert(otherRegistration.response.status === 201, `other registration returned ${otherRegistration.response.status}`)
  otherId = otherRegistration.body.user.id
  const otherToken = otherRegistration.body.token

  await client.query(`UPDATE public.users SET timezone = 'UTC' WHERE id = ANY($1::uuid[])`, [[ownerId, otherId]])
  await client.query(`INSERT INTO public.user_settings (user_id, week_starts_on) VALUES ($1, 1)
    ON CONFLICT (user_id) DO UPDATE SET week_starts_on = EXCLUDED.week_starts_on`, [ownerId])
  const weekResult = await client.query(`SELECT
    (NOW() AT TIME ZONE 'UTC')::date::text AS today,
    EXTRACT(DOW FROM NOW() AT TIME ZONE 'UTC')::int AS day_of_week`)
  const daysSinceMonday = (weekResult.rows[0].day_of_week + 6) % 7
  const weekStart = new Date(`${weekResult.rows[0].today}T00:00:00.000Z`)
  weekStart.setUTCDate(weekStart.getUTCDate() - daysSinceMonday)
  const weekStartDate = weekStart.toISOString().slice(0, 10)

  const consistencyTasks = []
  for (const [index, offset] of [0, 1, 2].entries()) {
    const task = await createTask(ownerToken, `Consistency task ${index + 1}`)
    await client.query('UPDATE public.tasks SET completed_at = $1 WHERE id = $2 AND user_id = $3', [dateAtNoon(weekStartDate, offset), task.id, ownerId])
    await completeTask(ownerToken, task.id)
    consistencyTasks.push(task)
  }

  const taskGoal = await createGoal(ownerToken, 'Derived completion goal')
  const taskRoadmap = await createRoadmap(ownerToken, taskGoal.id)
  const taskMilestone = await createMilestone(ownerToken, taskRoadmap.id, 'Derived milestone')
  const taskSkill = await createSkill(ownerToken, taskMilestone.id, 'Derived skill')
  const relevantTask = await createTask(ownerToken, 'Complete derived skill', { goal_id: taskGoal.id, skill_id: taskSkill.id })
  await completeTask(ownerToken, relevantTask.id)
  const skillCompletion = await request(`/api/skills/${taskSkill.id}/completion`, {
    method: 'PATCH', body: JSON.stringify({ completed: true }),
  }, ownerToken)
  assert(skillCompletion.response.status === 200, `skill completion returned ${skillCompletion.response.status}`)

  const manualGoal = await createGoal(ownerToken, 'Manual progress only goal')
  const manualRoadmap = await createRoadmap(ownerToken, manualGoal.id)
  const manualMilestone = await createMilestone(ownerToken, manualRoadmap.id, 'Manual progress only milestone')
  const manualSkill = await createSkill(ownerToken, manualMilestone.id, 'Manual progress only skill')
  const manualMilestoneResult = await request(`/api/milestones/${manualMilestone.id}`, {
    method: 'PATCH', body: JSON.stringify({ status: 'completed', progress_percentage: 100 }),
  }, ownerToken)
  assert(manualMilestoneResult.response.status === 400, `manual milestone completion returned ${manualMilestoneResult.response.status}`)
  const manualSkillResult = await request(`/api/skills/${manualSkill.id}`, {
    method: 'PATCH', body: JSON.stringify({ status: 'completed', progress_percentage: 100 }),
  }, ownerToken)
  assert(manualSkillResult.response.status === 400, `manual skill completion returned ${manualSkillResult.response.status}`)
  await client.query('UPDATE public.goals SET progress_percentage = 100 WHERE id = $1 AND user_id = $2', [manualGoal.id, ownerId])

  const completedGoal = await createGoal(ownerToken, 'Explicitly completed goal')
  await client.query('UPDATE public.goals SET progress_percentage = 100 WHERE id = $1 AND user_id = $2', [completedGoal.id, ownerId])
  const beforeGoalCompletion = await request('/api/achievements', {}, ownerToken)
  assert(beforeGoalCompletion.response.status === 200, `pre-completion achievement list returned ${beforeGoalCompletion.response.status}: ${beforeGoalCompletion.body.message || ''}`)
  assert(!beforeGoalCompletion.body.achievements.some((item) => item.type === 'goal_completed'), 'progress percentage alone awarded goal completion')
  const firstGoalCompletion = await request(`/api/goals/${completedGoal.id}`, {
    method: 'PATCH', body: JSON.stringify({ status: 'completed' }),
  }, ownerToken)
  assert(firstGoalCompletion.response.status === 200 && firstGoalCompletion.body.goal.completed_at, 'goal completion timestamp was not persisted')

  await Promise.all(Array.from({ length: 4 }, () => completeTask(ownerToken, consistencyTasks[2].id)))
  await Promise.all(Array.from({ length: 4 }, () => request(`/api/goals/${completedGoal.id}`, {
    method: 'PATCH', body: JSON.stringify({ status: 'completed' }),
  }, ownerToken)))

  const listResult = await request('/api/achievements', {}, ownerToken)
  assert(listResult.response.status === 200, `achievement list returned ${listResult.response.status}`)
  const earned = listResult.body.achievements
  const types = earned.map((item) => item.type)
  for (const requiredType of ['first_task_completed', 'weekly_consistency', 'skill_completed', 'milestone_completed', 'goal_completed']) {
    assert(types.includes(requiredType), `missing ${requiredType} achievement`)
  }
  assert(!earned.some((item) => item.title.includes('Manual progress only')), 'manual milestone/skill/goal fields created an achievement')
  assert(earned.length === 5, `expected five distinct awards, found ${earned.length}`)
  assert(new Set(earned.map((item) => item.achievement_key)).size === earned.length, 'award keys are not unique')
  assert(earned.every((item) => item.earned_at && item.description), 'an earned achievement is missing its date or explanation')

  const persisted = await request('/api/achievements', {}, ownerToken)
  assert(persisted.body.achievements.length === earned.length, 'earned achievements did not persist across independent reads')
  const detail = await request(`/api/achievements/${earned[0].id}`, {}, ownerToken)
  assert(detail.response.status === 200 && detail.body.achievement.id === earned[0].id, 'owned achievement detail was unavailable')
  const crossUserDetail = await request(`/api/achievements/${earned[0].id}`, {}, otherToken)
  assert(crossUserDetail.response.status === 404, `cross-user detail returned ${crossUserDetail.response.status}`)
  const otherList = await request('/api/achievements', {}, otherToken)
  assert(otherList.response.status === 200 && otherList.body.achievements.length === 0, 'achievement list leaked across users')
  const unauthenticated = await request('/api/achievements')
  assert(unauthenticated.response.status === 401, 'unauthenticated achievement list was accepted')
  const clientAwardAttempt = await request('/api/achievements', {
    method: 'POST', body: JSON.stringify({ type: 'goal_completed', title: 'Forged award' }),
  }, ownerToken)
  assert(clientAwardAttempt.response.status === 404, 'client award endpoint exists')

  console.log(JSON.stringify({
    result: 'passed',
    awards: earned.map(({ type, title }) => ({ type, title })),
    repeatedAndConcurrentCompletionRequestsIdempotent: true,
    threeDistinctPersistedCompletionDatesRecognized: true,
    progressEditsAloneDidNotAward: true,
    earnedRecordsPersistedAcrossReads: true,
    ownerDetailAndCrossUserProtectionVerified: true,
    clientsCannotWriteAwards: true,
  }, null, 2))
} finally {
  try {
    await deleteTestUser(ownerId)
    await deleteTestUser(otherId)
    if (ownerId || otherId) console.log('Temporary achievement test accounts and dependent records deleted.')
  } finally {
    await client.end().catch(() => {})
  }
}