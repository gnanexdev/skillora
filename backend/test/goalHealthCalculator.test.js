import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateGoalHealth } from '../src/services/goalHealthService.js'

function buildInput(overrides = {}) {
  return {
    goal: { id: 'goal-1', title: 'Become an AI Engineer', target_date: '2027-01-01' },
    progress: {
      goal: { progress: 62, hasEvidence: true, state: 'in_progress' },
    },
    signals: {
      progress: 62,
      remainingProgress: 38,
      daysRemaining: 84,
      overdueTasks: 0,
      recentCompletionRate: 0.8,
      completedTasks: 4,
      plannedTasks: 8,
      unfinishedTasks: 4,
    },
    ...overrides,
  }
}

test('completed goals use calculated progress and are completed', () => {
  const result = calculateGoalHealth(buildInput({
    progress: { goal: { progress: 100, hasEvidence: true, state: 'completed' } },
    signals: { progress: 100, remainingProgress: 0, daysRemaining: 0, overdueTasks: 0, recentCompletionRate: 1, completedTasks: 8, plannedTasks: 8, unfinishedTasks: 0 },
  }))
  assert.equal(result.health.status, 'completed')
  assert.equal(result.health.label, 'Completed')
})

test('goals without meaningful execution evidence are not treated as failures', () => {
  const result = calculateGoalHealth(buildInput({
    progress: { goal: { progress: 0, hasEvidence: false, state: 'no_evidence' } },
    signals: { progress: 0, remainingProgress: 100, daysRemaining: 84, overdueTasks: 0, recentCompletionRate: 0, completedTasks: 0, plannedTasks: 0, unfinishedTasks: 0 },
  }))
  assert.equal(result.health.status, 'no_evidence')
  assert.match(result.health.reason, /not enough activity/i)
})

test('healthy progress with no strong warning signals is on track', () => {
  const result = calculateGoalHealth(buildInput())
  assert.equal(result.health.status, 'on_track')
  assert.equal(result.health.label, 'On Track')
  assert.match(result.health.reason, /steady progress/i)
})

test('repeated overdue work is at risk without making one missed task a failure', () => {
  const repeated = calculateGoalHealth(buildInput({
    signals: { progress: 62, remainingProgress: 38, daysRemaining: 84, overdueTasks: 2, recentCompletionRate: 0.8, completedTasks: 4, plannedTasks: 8, unfinishedTasks: 4 },
  }))
  assert.equal(repeated.health.status, 'at_risk')
  assert.match(repeated.health.reason, /missed recently/i)

  const single = calculateGoalHealth(buildInput({
    signals: { progress: 62, remainingProgress: 38, daysRemaining: 84, overdueTasks: 1, recentCompletionRate: 0.8, completedTasks: 4, plannedTasks: 8, unfinishedTasks: 4 },
  }))
  assert.equal(single.health.status, 'on_track')
})

test('insufficient pace near the target date is behind', () => {
  const result = calculateGoalHealth(buildInput({
    goal: { id: 'goal-1', title: 'Become an AI Engineer', target_date: '2026-10-10' },
    signals: { progress: 35, remainingProgress: 65, daysRemaining: 2, overdueTasks: 0, recentCompletionRate: 0.25, completedTasks: 1, plannedTasks: 9, unfinishedTasks: 8 },
  }))
  assert.equal(result.health.status, 'behind')
  assert.match(result.health.reason, /target date/i)
})

test('a goal past its target date with substantial work remaining is behind', () => {
  const result = calculateGoalHealth(buildInput({
    goal: { id: 'goal-1', title: 'Become an AI Engineer', target_date: '2026-10-01' },
    signals: { progress: 35, remainingProgress: 65, daysRemaining: -6, overdueTasks: 0, recentCompletionRate: 0.3, completedTasks: 1, plannedTasks: 9, unfinishedTasks: 8 },
  }))
  assert.equal(result.health.status, 'behind')
})

test('goals without a target date do not become behind solely because of timing', () => {
  const result = calculateGoalHealth(buildInput({
    goal: { id: 'goal-1', title: 'Become an AI Engineer', target_date: null },
    signals: { progress: 35, remainingProgress: 65, daysRemaining: null, overdueTasks: 0, recentCompletionRate: 0.8, completedTasks: 4, plannedTasks: 8, unfinishedTasks: 4 },
  }))
  assert.equal(result.health.status, 'on_track')
})

test('life events and planning recommendations are contextual and do not determine health', () => {
  const result = calculateGoalHealth(buildInput({
    goal: { id: 'goal-1', title: 'Become an AI Engineer', target_date: '2027-01-01' },
    signals: { progress: 62, remainingProgress: 38, daysRemaining: 84, overdueTasks: 0, recentCompletionRate: 0.8, completedTasks: 4, plannedTasks: 8, unfinishedTasks: 4 },
    context: { life_events: ['family-event'], planning_recommendations: ['capacity-overload'] },
  }))
  assert.equal(result.health.status, 'on_track')
  assert.equal(result.contextualEvidence, false)
})
