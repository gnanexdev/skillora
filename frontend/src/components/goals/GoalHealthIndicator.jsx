import { useEffect, useState } from 'react'
import goalsApi from '../../services/goalsApi.js'

const healthLabels = {
  no_evidence: 'No Evidence',
  on_track: 'On Track',
  at_risk: 'At Risk',
  behind: 'Behind',
  completed: 'Completed',
}

export function GoalHealthIndicator({ goalId, compact = false }) {
  const [health, setHealth] = useState(null)

  useEffect(() => {
    let active = true
    goalsApi.health(goalId)
      .then((result) => {
        if (active) setHealth(result.health)
      })
      .catch(() => {
        if (active) setHealth(null)
      })
    return () => { active = false }
  }, [goalId])

  if (!health) return null

  return (
    <span className={`goal-health-indicator goal-health-indicator--${health.status}${compact ? ' goal-health-indicator--compact' : ''}`} title={health.reason}>
      <span className="goal-health-indicator__dot" aria-hidden="true" />
      {healthLabels[health.status] || health.status}
    </span>
  )
}

export default GoalHealthIndicator
