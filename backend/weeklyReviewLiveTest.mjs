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

function shiftDate(value, days) {
  const date = new Date(`${value}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
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
    body: JSON.stringify({ name: 'Weekly Review Test', email: `weekly-review-${unique}@example.invalid`, password: 'WeeklyReviewTest123!' }),
  })
  assert(ownerRegistration.response.status === 201, `owner registration returned ${ownerRegistration.response.status}`)
  ownerId = ownerRegistration.body.user.id
  const ownerToken = ownerRegistration.body.token

  const otherRegistration = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Weekly Review Other', email: `weekly-review-other-${unique}@example.invalid`, password: 'WeeklyReviewTest123!' }),
  })
  assert(otherRegistration.response.status === 201, `other registration returned ${otherRegistration.response.status}`)
  otherId = otherRegistration.body.user.id
  const otherToken = otherRegistration.body.token

  await client.query(`UPDATE public.users SET timezone = 'Pacific/Kiritimati' WHERE id = $1`, [ownerId])
  await client.query(`INSERT INTO public.user_settings (user_id, week_starts_on) VALUES ($1, 0)
    ON CONFLICT (user_id) DO UPDATE SET week_starts_on = EXCLUDED.week_starts_on`, [ownerId])
  await client.query(`UPDATE public.users SET timezone = 'Pacific/Kiritimati' WHERE id = $1`, [otherId])
  await client.query(`INSERT INTO public.user_settings (user_id, week_starts_on) VALUES ($1, 0)
    ON CONFLICT (user_id) DO UPDATE SET week_starts_on = EXCLUDED.week_starts_on`, [otherId])
  const localDateResult = await client.query(`SELECT
    (NOW() AT TIME ZONE (SELECT timezone FROM public.users WHERE id = $1))::date::text AS today,
    EXTRACT(DOW FROM NOW() AT TIME ZONE (SELECT timezone FROM public.users WHERE id = $1))::int AS dow`, [ownerId])
  const localToday = localDateResult.rows[0].today
  const expectedStart = shiftDate(localToday, -localDateResult.rows[0].dow)
  const expectedEnd = shiftDate(expectedStart, 6)

  const currentResult = await request('/api/weekly-reviews', {}, ownerToken)
  assert(currentResult.response.status === 200, `current review returned ${currentResult.response.status}`)
  assert(currentResult.body.week.week_start_date === expectedStart, 'current week start did not use configured timezone and Sunday start')
  assert(currentResult.body.week.week_end_date === expectedEnd, 'current week end did not match seven-day configured week')
  assert(currentResult.body.week.current_next_week_start_date === shiftDate(expectedStart, 7), 'current next-week date did not follow the configured calendar week')
  assert(currentResult.body.week.timezone === 'Pacific/Kiritimati', 'timezone was not reported from user profile')

  const previousStart = shiftDate(expectedStart, -7)
  const emptyResult = await request(`/api/weekly-reviews?week_start_date=${previousStart}`, {}, ownerToken)
  assert(emptyResult.response.status === 200, `empty week returned ${emptyResult.response.status}`)
  assert(emptyResult.body.week.current_next_week_start_date === shiftDate(expectedStart, 7), 'reviewing a previous week changed the next-week destination')
  assert(emptyResult.body.summary.total_planned_tasks === 0, 'empty week has planned tasks')
  assert(emptyResult.body.summary.completed_tasks === 0 && emptyResult.body.summary.unfinished_tasks === 0 && emptyResult.body.summary.skipped_tasks === 0, 'empty week counts were not zero')
  const emptyWeekSave = await request('/api/weekly-reviews', {
    method: 'PUT', body: JSON.stringify({ week_start_date: previousStart, went_well: 'Reflection without a plan' }),
  }, ownerToken)
  assert(emptyWeekSave.response.status === 200, `empty-week reflection save returned ${emptyWeekSave.response.status}`)
  const emptyWeekPlanCount = await client.query('SELECT COUNT(*)::int AS count FROM public.weekly_plans WHERE user_id = $1 AND week_start_date = $2', [ownerId, previousStart])
  assert(emptyWeekPlanCount.rows[0].count === 0, 'reflection created a weekly plan')

  const invalidResult = await request('/api/weekly-reviews?week_start_date=2026-02-30', {}, ownerToken)
  assert(invalidResult.response.status === 400, `invalid date returned ${invalidResult.response.status}`)
  const misalignedStart = shiftDate(expectedStart, 1)
  const misalignedResult = await request(`/api/weekly-reviews?week_start_date=${misalignedStart}`, {}, ownerToken)
  assert(misalignedResult.response.status === 400, `misaligned date returned ${misalignedResult.response.status}`)

  const planResult = await request('/api/weekly-plans', {
    method: 'POST',
    body: JSON.stringify({ week_start_date: expectedStart, available_hours: 0.5, focus: 'Live weekly review verification' }),
  }, ownerToken)
  assert(planResult.response.status === 201, `plan creation returned ${planResult.response.status}`)
  const planId = planResult.body.weeklyPlan.id

  for (const [title, status] of [['Review completed', 'completed'], ['Review unfinished', 'pending'], ['Review skipped', 'skipped']]) {
    const taskResult = await request(`/api/weekly-plans/${planId}/tasks`, {
      method: 'POST',
      body: JSON.stringify({ title, estimated_minutes: 30, status }),
    }, ownerToken)
    assert(taskResult.response.status === 201, `task creation for ${status} returned ${taskResult.response.status}`)
  }

  const populatedResult = await request(`/api/weekly-reviews?week_start_date=${expectedStart}`, {}, ownerToken)
  const { summary } = populatedResult.body
  assert(summary.total_planned_tasks === 3, `expected three planned tasks, got ${summary.total_planned_tasks}`)
  assert(summary.completed_tasks === 1 && summary.unfinished_tasks === 1 && summary.skipped_tasks === 1, 'task status counts were inaccurate')
  assert(summary.rescheduled_tasks === null, 'rescheduled count was presented as a known value')
  assert(summary.exceeds_planned_capacity === true, 'capacity observation did not use recorded task and plan estimates')
  assert(summary.goal_progress.available === false, 'historical goal progress was presented as available')

  const reflection = { went_well: 'First reflection', difficult: 'A challenge', learned: 'A lesson', improve_next_week: 'One change', notes: '' }
  const firstSave = await request('/api/weekly-reviews', {
    method: 'PUT', body: JSON.stringify({ week_start_date: expectedStart, ...reflection }),
  }, ownerToken)
  assert(firstSave.response.status === 200, `first save returned ${firstSave.response.status}`)
  const secondSave = await request('/api/weekly-reviews', {
    method: 'PUT', body: JSON.stringify({ week_start_date: expectedStart, ...reflection, went_well: 'Edited reflection' }),
  }, ownerToken)
  assert(secondSave.response.status === 200 && secondSave.body.review.went_well === 'Edited reflection', 'reflection edit did not update the existing review')
  const reviewCount = await client.query('SELECT COUNT(*)::int AS count FROM public.weekly_review_entries WHERE user_id = $1 AND week_start_date = $2', [ownerId, expectedStart])
  assert(reviewCount.rows[0].count === 1, 'duplicate submissions created multiple review rows')

  const crossUser = await request(`/api/weekly-reviews?week_start_date=${expectedStart}`, {}, otherToken)
  assert(crossUser.response.status === 200 && crossUser.body.review === null, 'another user could access the owner review')
  assert(crossUser.body.summary.total_planned_tasks === 0, 'another user could see owner task counts')
  const unauthenticated = await request(`/api/weekly-reviews?week_start_date=${expectedStart}`)
  assert(unauthenticated.response.status === 401, 'unauthenticated request was accepted')

  console.log(JSON.stringify({
    result: 'passed',
    configuredTimezone: 'Pacific/Kiritimati',
    configuredWeekStartsOn: 'Sunday',
    currentWeek: { start: expectedStart, end: expectedEnd },
    emptyWeek: true,
    reflectionSavedWithoutPlan: true,
    taskCounts: { planned: summary.total_planned_tasks, completed: summary.completed_tasks, unfinished: summary.unfinished_tasks, skipped: summary.skipped_tasks },
    reschedulesUnavailable: summary.rescheduled_tasks === null,
    historicalGoalProgressUnavailable: !summary.goal_progress.available,
    capacityOverloadObserved: summary.exceeds_planned_capacity,
    reviewSavedAndUpdated: true,
    duplicateRowsPrevented: true,
    crossUserAndUnauthenticatedAccessBlocked: true,
  }, null, 2))
} finally {
  try {
    await deleteTestUser(ownerId)
    await deleteTestUser(otherId)
    if (ownerId || otherId) console.log('Temporary test accounts and dependent records deleted.')
  } finally {
    await client.end().catch(() => {})
  }
}