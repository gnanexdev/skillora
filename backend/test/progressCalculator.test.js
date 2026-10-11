import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateGoalProgress,
  calculateMilestoneProgress,
  calculateSkillProgress,
} from '../src/services/progressCalculator.js'

function skill(id, name, tasks = []) {
  return { id, title: name, tasks }
}

function milestone(id, title, skills = []) {
  return { id, title, skills }
}

test('an incomplete skill stays at zero regardless of linked task state', () => {
  const result = calculateSkillProgress(skill('skill-1', 'Functions'))
  assert.equal(result.progress, 0)
  assert.equal(result.hasEvidence, true)
  assert.equal(result.status, 'pending')
})

test('skill completion comes from its persisted status, not task percentages', () => {
  const result = calculateSkillProgress(skill('skill-1', 'Functions', [
    { id: 't1', status: 'completed' },
    { id: 't2', status: 'pending' },
    { id: 't3', status: 'completed' },
    { id: 't4', status: 'in_progress' },
  ]))
  assert.equal(result.progress, 0)
  assert.equal(result.hasEvidence, true)
  assert.equal(result.state, 'incomplete')
})

test('a skill marked completed reaches 100 percent', () => {
  const result = calculateSkillProgress({ id: 'skill-1', title: 'Functions', status: 'completed' })
  assert.equal(result.progress, 100)
  assert.equal(result.hasEvidence, true)
})

test('an empty milestone has no evidence and zero progress', () => {
  assert.deepEqual(calculateMilestoneProgress(milestone('m1', 'Foundation')), {
    id: 'm1',
    title: 'Foundation',
    progress: 0,
    hasEvidence: false,
    state: 'no_evidence',
    status: 'pending',
    skills: [],
  })
})

test('milestone progress is completed skills divided by its skill count', () => {
  const result = calculateMilestoneProgress(milestone('m1', 'Foundation', [
    { id: 's1', name: 'Functions', status: 'completed' },
    { id: 's2', name: 'Arrays', status: 'pending' },
  ]))
  assert.equal(result.progress, 50)
  assert.equal(result.hasEvidence, true)
  assert.equal(result.skills[0].progress, 100)
  assert.equal(result.skills[1].progress, 0)
  assert.equal(result.status, 'active')
})

test('roadmap progress is completed milestones divided by total milestones', () => {
  const result = calculateGoalProgress({
    id: 'goal-1',
    title: 'Build a portfolio',
    milestones: [
      milestone('m1', 'Frontend', [{ id: 's1', title: 'HTML', status: 'completed' }]),
      milestone('m2', 'Backend', [{ id: 's2', title: 'API', status: 'completed' }, { id: 's3', title: 'Database', status: 'pending' }]),
    ],
  })
  assert.equal(result.progress, 50)
  assert.equal(result.hasEvidence, true)
  assert.equal(result.state, 'in_progress')
  assert.equal(result.completedMilestones, 1)
  assert.equal(result.totalMilestones, 2)
})

test('a goal with no roadmap has no evidence', () => {
  const result = calculateGoalProgress({ id: 'goal-1', title: 'Learning', milestones: [] })
  assert.equal(result.progress, 0)
  assert.equal(result.hasEvidence, false)
  assert.equal(result.state, 'no_evidence')
})

test('changing a skill completion status recalculates milestone and roadmap percentages', () => {
  const goal = { id: 'goal-1', title: 'Roadmap', milestones: [milestone('m1', 'Core', [{ id: 's1', name: 'Functions', status: 'pending' }, { id: 's2', name: 'Testing', status: 'pending' }])] }
  const initial = calculateGoalProgress(goal)
  goal.milestones[0].skills[0].status = 'completed'
  const updated = calculateGoalProgress(goal)
  assert.equal(initial.progress, 0)
  assert.equal(initial.milestones[0].progress, 0)
  assert.equal(updated.milestones[0].progress, 50)
  assert.equal(updated.progress, 0)
  goal.milestones[0].skills[1].status = 'completed'
  const completed = calculateGoalProgress(goal)
  assert.equal(completed.milestones[0].progress, 100)
  assert.equal(completed.progress, 100)
  goal.milestones[0].skills[0].status = 'pending'
  const incomplete = calculateGoalProgress(goal)
  assert.equal(incomplete.milestones[0].progress, 50)
  assert.equal(incomplete.progress, 0)
})

test('empty roadmap and empty milestone never appear complete', () => {
  const empty = calculateGoalProgress({ id: 'g', milestones: [] })
  const emptyMilestone = calculateGoalProgress({ id: 'g', milestones: [milestone('m', 'Empty')] })
  assert.equal(empty.progress, 0)
  assert.equal(empty.hasEvidence, false)
  assert.equal(emptyMilestone.progress, 0)
  assert.equal(emptyMilestone.milestones[0].progress, 0)
  assert.equal(emptyMilestone.milestones[0].status, 'pending')
})
