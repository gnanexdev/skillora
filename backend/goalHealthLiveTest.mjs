import pg from 'pg'

const apiBase = process.env.API_BASE_URL || 'http://127.0.0.1:5000'
const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is required')
const client = new pg.Client({ connectionString: databaseUrl })
const run = async (path, options = {}, token = null) => {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(`${path} -> ${response.status}: ${body.message || JSON.stringify(body)}`)
  return body
}
const cleanup = async () => {
  if (!ownerId) return
  await client.query(`DELETE FROM public.planning_recommendations WHERE user_id = $1`, [ownerId])
  await client.query(`DELETE FROM public.tasks WHERE user_id = $1`, [ownerId])
  await client.query(`DELETE FROM public.life_events WHERE user_id = $1`, [ownerId])
  await client.query(`DELETE FROM public.weekly_plans WHERE user_id = $1`, [ownerId])
  await client.query(`
    DELETE FROM public.skills
    WHERE milestone_id IN (
      SELECT id FROM public.milestones
      WHERE roadmap_id IN (
        SELECT id FROM public.roadmaps
        WHERE goal_id IN (
          SELECT id FROM public.goals WHERE user_id = $1
        )
      )
    )
  `, [ownerId])
  await client.query(`
    DELETE FROM public.milestones
    WHERE roadmap_id IN (
      SELECT id FROM public.roadmaps
      WHERE goal_id IN (
        SELECT id FROM public.goals WHERE user_id = $1
      )
    )
  `, [ownerId])
  await client.query(`
    DELETE FROM public.roadmaps
    WHERE goal_id IN (
      SELECT id FROM public.goals WHERE user_id = $1
    )
  `, [ownerId])
  await client.query(`DELETE FROM public.goals WHERE user_id = $1`, [ownerId])
  await client.query(`DELETE FROM public.users WHERE id = $1`, [ownerId])
  if (otherUserId) await client.query(`DELETE FROM public.users WHERE id = $1`, [otherUserId])
}

let ownerId
let otherUserId
let token
let otherToken
let noRoadmapId
let healthyId
let overdueId
let nearDateId
let completedId
let lifeEventId

try {
  await client.connect()
  await client.query('SELECT 1')
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const owner = await run('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Goal Health LiveOwner', email: `goal-health-${unique}@example.invalid`, password: 'LiveVerification123!' }),
  })
  ownerId = owner.user.id
  token = owner.token
  const other = await run('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Goal Health LiveOther', email: `goal-health-other-${unique}@example.invalid`, password: 'LiveVerification123!' }),
  })
  otherUserId = other.user.id
  otherToken = other.token

  const createGoal = async (title, target_date = null, status = 'active') => run('/api/goals', {
    method: 'POST',
    body: JSON.stringify({ title, target_date, priority: 'medium', status }),
  }, token)
  const createRoadmap = async (goalId, title) => run(`/api/goals/${goalId}/roadmap`, {
    method: 'POST',
    body: JSON.stringify({ title, description: 'Live integration fixture' }),
  }, token)
  const createMilestone = async (roadmapId, title, position) => run(`/api/roadmaps/${roadmapId}/milestones`, {
    method: 'POST',
    body: JSON.stringify({ title, position, description: 'Live integration milestone' }),
  }, token)
  const completeSkill = async (skillId) => run(`/api/skills/${skillId}/completion`, {
    method: 'PATCH', body: JSON.stringify({ completed: true }),
  }, token)
  const createSkill = async (milestoneId, name, position) => run(`/api/milestones/${milestoneId}/skills`, {
    method: 'POST',
    body: JSON.stringify({ name, position, description: 'Live integration skill' }),
  }, token)
  const createTask = async (goalId, skillId, title, status, due_date) => run('/api/tasks', {
    method: 'POST',
    body: JSON.stringify({ goal_id: goalId, skill_id: skillId, title, due_date, estimated_minutes: 30, priority: 'medium', status }),
  }, token)

  const noRoadmap = await createGoal('Goal Health No Roadmap')
  noRoadmapId = noRoadmap.goal.id

  const healthyGoal = await createGoal('Goal Health Healthy')
  healthyId = healthyGoal.goal.id
  const healthyRoadmap = await createRoadmap(healthyId, 'Healthy roadmap')
  const healthyMilestone = await createMilestone(healthyRoadmap.roadmap.id, 'Healthy milestone', 1)
  const healthySkill = await createSkill(healthyMilestone.milestone.id, 'Healthy skill', 1)
  await completeSkill(healthySkill.skill.id)
  await createTask(healthyId, healthySkill.skill.id, 'Complete healthy task', 'completed', null)

  const overdueGoal = await createGoal('Goal Health Overdue')
  overdueId = overdueGoal.goal.id
  const overdueRoadmap = await createRoadmap(overdueId, 'Overdue roadmap')
  const overdueMilestones = await Promise.all([1, 2, 3].map((position) => createMilestone(overdueRoadmap.roadmap.id, `Overdue milestone ${position}`, position)))
  const overdueSkill = await createSkill(overdueMilestones[0].milestone.id, 'Overdue skill', 1)
  await createSkill(overdueMilestones[1].milestone.id, 'Overdue skill two', 1)
  await createSkill(overdueMilestones[2].milestone.id, 'Overdue skill three', 1)
  await completeSkill(overdueSkill.skill.id)
  const overdueDate = new Date()
  overdueDate.setUTCDate(overdueDate.getUTCDate() - 2)
  const overdueDateString = overdueDate.toISOString().slice(0, 10)
  await createTask(overdueId, overdueSkill.skill.id, 'Complete overdue task one', 'completed', null)
  await createTask(overdueId, overdueSkill.skill.id, 'Miss overdue task one', 'pending', overdueDateString)
  await createTask(overdueId, overdueSkill.skill.id, 'Miss overdue task two', 'pending', overdueDateString)

  const nearGoal = await createGoal('Goal Health Near Target', new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10))
  nearDateId = nearGoal.goal.id
  const nearRoadmap = await createRoadmap(nearDateId, 'Near target roadmap')
  const nearMilestone = await createMilestone(nearRoadmap.roadmap.id, 'Near target milestone', 1)
  const nearSecondMilestone = await createMilestone(nearRoadmap.roadmap.id, 'Near target milestone two', 2)
  const nearSkill = await createSkill(nearMilestone.milestone.id, 'Near target skill', 1)
  await createSkill(nearSecondMilestone.milestone.id, 'Near target skill two', 1)
  await completeSkill(nearSkill.skill.id)
  await createTask(nearDateId, nearSkill.skill.id, 'Complete near target task', 'completed', null)
  await createTask(nearDateId, nearSkill.skill.id, 'Pending near target task', 'pending', null)

  const completedGoal = await createGoal('Goal Health Completed')
  completedId = completedGoal.goal.id
  const completedRoadmap = await createRoadmap(completedId, 'Completed roadmap')
  const completedMilestone = await createMilestone(completedRoadmap.roadmap.id, 'Completed milestone', 1)
  const completedSkill = await createSkill(completedMilestone.milestone.id, 'Completed skill', 1)
  await completeSkill(completedSkill.skill.id)
  await createTask(completedId, completedSkill.skill.id, 'Complete goal', 'completed', null)
  await run(`/api/goals/${completedId}`, { method: 'PATCH', body: JSON.stringify({ status: 'completed' }) }, token)

  const lifeEvent = await run('/api/life-events', {
    method: 'POST',
    body: JSON.stringify({
      title: 'Temporary Life Context Fixture',
      description: 'Temporary event that must not alter Goal Health',
      event_type: 'personal',
      start_date: new Date().toISOString().slice(0, 10),
      end_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      impact_level: 'medium',
    }),
  }, token)
  lifeEventId = lifeEvent.lifeEvent.id

  const healthCalls = {}
  const readHealth = async (goalId) => {
    const response = await run(`/api/goals/${goalId}/health`, {}, token)
    healthCalls[goalId] = response
    return response
  }
  const noRoadmapHealth = await readHealth(noRoadmapId)
  const healthyHealth = await readHealth(healthyId)
  const overdueHealth = await readHealth(overdueId)
  const nearHealth = await readHealth(nearDateId)
  const completedHealth = await readHealth(completedId)
  const lifeHealth = await readHealth(healthyId)

  const progressHealthy = await run(`/api/goals/${healthyId}/progress`, {}, token)
  const progressOverdue = await run(`/api/goals/${overdueId}/progress`, {}, token)
  const expected = {
    noRoadmap: { status: 'no_evidence', progress: 0, explanation: 'not enough activity' },
    healthy: { status: 'completed', progress: 100, explanation: 'All roadmap work is complete' },
    overdue: { status: 'at_risk', progress: 33, explanation: 'missed recently' },
    near: { status: 'behind', progress: 50, explanation: 'target date' },
    completed: { status: 'completed', progress: 100, explanation: 'All roadmap work is complete' },
  }
  if (noRoadmapHealth.health.status !== expected.noRoadmap.status || noRoadmapHealth.health.reason.toLowerCase().indexOf(expected.noRoadmap.explanation.toLowerCase()) < 0 || noRoadmapHealth.signals.progress !== expected.noRoadmap.progress) throw new Error('No-roadmap health assertion failed')
  if (healthyHealth.health.status !== expected.healthy.status || healthyHealth.signals.progress !== expected.healthy.progress || healthyHealth.health.reason.toLowerCase().indexOf(expected.healthy.explanation.toLowerCase()) < 0) throw new Error('Healthy execution health assertion failed: ' + JSON.stringify(healthyHealth))
  if (overdueHealth.health.status !== expected.overdue.status || overdueHealth.signals.progress !== expected.overdue.progress || overdueHealth.health.reason.toLowerCase().indexOf(expected.overdue.explanation.toLowerCase()) < 0) throw new Error('Overdue health assertion failed')
  if (nearHealth.health.status !== expected.near.status || nearHealth.signals.progress !== expected.near.progress || nearHealth.health.reason.toLowerCase().indexOf(expected.near.explanation.toLowerCase()) < 0) throw new Error('Near-target health assertion failed')
  if (completedHealth.health.status !== expected.completed.status || completedHealth.signals.progress !== expected.completed.progress || completedHealth.health.reason.toLowerCase().indexOf(expected.completed.explanation.toLowerCase()) < 0) throw new Error('Completed health assertion failed')
  if (healthCalls[healthyId].health.status !== lifeHealth.health.status) throw new Error('Life event health comparison failed')
  if (progressHealthy.goal.progress !== healthyHealth.signals.progress || progressOverdue.goal.progress !== overdueHealth.signals.progress) throw new Error('Progress Engine result mismatch')
  if (healthyHealth.signals.recentCompletionRate === undefined || healthyHealth.signals.overdueTasks === undefined || healthyHealth.signals.daysRemaining === undefined) throw new Error('Health signals incomplete')

  const beforeReadOnly = await client.query('SELECT COUNT(*) AS goals FROM public.goals WHERE user_id = $1', [ownerId])
  const beforeCounts = await client.query(`SELECT
    (SELECT COUNT(*) FROM public.goals WHERE user_id=$1) AS goals,
    (SELECT COUNT(*) FROM public.tasks WHERE user_id=$1) AS tasks,
    (SELECT COUNT(*) FROM public.roadmaps r JOIN public.goals g ON g.id=r.goal_id WHERE g.user_id=$1) AS roadmaps,
    (SELECT COUNT(*) FROM public.milestones m JOIN public.roadmaps r ON r.id=m.roadmap_id JOIN public.goals g ON g.id=r.goal_id WHERE g.user_id=$1) AS milestones,
    (SELECT COUNT(*) FROM public.skills s JOIN public.milestones m ON m.id=s.milestone_id JOIN public.roadmaps r ON r.id=m.roadmap_id JOIN public.goals g ON g.id=r.goal_id WHERE g.user_id=$1) AS skills,
    (SELECT COUNT(*) FROM public.weekly_plans WHERE user_id=$1) AS weekly_plans,
    (SELECT COUNT(*) FROM public.life_events WHERE user_id=$1) AS life_events`, [ownerId])
  await run(`/api/goals/${healthyId}/health`, {}, token)
  const afterCounts = await client.query(`SELECT
    (SELECT COUNT(*) FROM public.goals WHERE user_id=$1) AS goals,
    (SELECT COUNT(*) FROM public.tasks WHERE user_id=$1) AS tasks,
    (SELECT COUNT(*) FROM public.roadmaps r JOIN public.goals g ON g.id=r.goal_id WHERE g.user_id=$1) AS roadmaps,
    (SELECT COUNT(*) FROM public.milestones m JOIN public.roadmaps r ON r.id=m.roadmap_id JOIN public.goals g ON g.id=r.goal_id WHERE g.user_id=$1) AS milestones,
    (SELECT COUNT(*) FROM public.skills s JOIN public.milestones m ON m.id=s.milestone_id JOIN public.roadmaps r ON r.id=m.roadmap_id JOIN public.goals g ON g.id=r.goal_id WHERE g.user_id=$1) AS skills,
    (SELECT COUNT(*) FROM public.weekly_plans WHERE user_id=$1) AS weekly_plans,
    (SELECT COUNT(*) FROM public.life_events WHERE user_id=$1) AS life_events`, [ownerId])
  if (JSON.stringify(beforeCounts.rows[0]) !== JSON.stringify(afterCounts.rows[0])) throw new Error('Goal Health modified persisted entities')

  const crossUser = await fetch(`${apiBase}/api/goals/${noRoadmapId}/health`, { headers: { Authorization: `Bearer ${otherToken}` } })
  if (crossUser.status !== 404) throw new Error(`Cross-user protection returned ${crossUser.status}`)

  const adaptiveBefore = await client.query('SELECT COUNT(*) AS recommendations FROM public.planning_recommendations WHERE user_id=$1', [ownerId])
  await run('/api/planning-suggestions?date=' + new Date().toISOString().slice(0, 10), {}, token)
  const adaptiveAfter = await client.query('SELECT COUNT(*) AS recommendations FROM public.planning_recommendations WHERE user_id=$1', [ownerId])
  if (adaptiveAfter.rows[0].recommendations < adaptiveBefore.rows[0].recommendations) throw new Error('Adaptive Planning evidence missing')
  const adaptiveHealthAfter = await run(`/api/goals/${healthyId}/health`, {}, token)
  if (adaptiveHealthAfter.health.status !== healthyHealth.health.status || adaptiveHealthAfter.signals.progress !== healthyHealth.signals.progress) throw new Error('Adaptive Planning changed Goal Health')

  const result = {
    backend: 'live',
    healthStates: {
      noRoadmap: noRoadmapHealth.health.status,
      healthy: healthyHealth.health.status,
      overdue: overdueHealth.health.status,
      nearTarget: nearHealth.health.status,
      completed: completedHealth.health.status,
      temporaryLifeEvent: lifeHealth.health.status,
    },
    progressEngineMatches: true,
    crossUserProtected: true,
    readOnlyVerified: true,
    adaptivePlanningDoesNotAlterHealth: true,
    signalsVerified: Object.keys(healthyHealth.signals),
    cleanupRequired: { goalCount: beforeReadOnly.rows[0].goals, lifeEventId },
  }
  console.log(JSON.stringify(result, null, 2))
} finally {
  if (ownerId) {
    try { await cleanup() } catch (error) { console.error('cleanup_failed=' + error.message) }
  }
  await client.end().catch(() => {})
}
