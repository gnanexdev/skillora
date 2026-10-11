import { useCallback, useEffect, useRef, useState } from 'react'
import { CalendarDays, Clock3, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import GoalForm from '../components/goals/GoalForm.jsx'
import GoalHealthIndicator from '../components/goals/GoalHealthIndicator.jsx'
import ProductHeader from '../components/layout/ProductHeader.jsx'
import RoadmapBuilder from '../components/roadmaps/RoadmapBuilder.jsx'
import goalsApi from '../services/goalsApi.js'
import progressApi from '../services/progressApi.js'
import ProgressBar from '../components/progress/ProgressBar.jsx'

function formatDate(value) {
  if (!value) return 'Not set'
  const date = new Date(value)
  return new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric', year: 'numeric' }).format(date)
}

export function GoalDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [goal, setGoal] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [progressData, setProgressData] = useState(null)
  const [progressError, setProgressError] = useState('')
  const [progressLoading, setProgressLoading] = useState(true)
  const editRoadmapRef = useRef(null)
  const registerRoadmapEditor = useCallback((editor) => { editRoadmapRef.current = editor }, [])

  useEffect(() => {
    let active = true
    goalsApi.get(id)
      .then(({ goal: loadedGoal }) => {
        if (active) setGoal(loadedGoal)
      })
      .catch((error) => {
        if (active) setErrorMessage(error.message || 'Unable to load this goal.')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => { active = false }
  }, [id])

  useEffect(() => {
    let active = true
    progressApi.forGoal(id)
      .then((result) => { if (active) setProgressData(result) })
      .catch((error) => { if (active) setProgressError(error.message || 'Unable to load calculated progress.') })
      .finally(() => { if (active) setProgressLoading(false) })
    return () => { active = false }
  }, [id])

  const handleUpdate = async (changes) => {
    const result = await goalsApi.update(id, changes)
    setGoal(result.goal)
    setIsEditing(false)
  }

  const refreshProgress = async () => {
    const result = await progressApi.forGoal(id)
    setProgressData(result)
    setProgressError('')
    return result
  }

  const handleDelete = async () => {
    const confirmed = window.confirm(`Delete “${goal.title}”? This action cannot be undone.`)
    if (!confirmed) return
    setIsDeleting(true)
    setErrorMessage('')
    try {
      await goalsApi.remove(id)
      navigate('/goals', { replace: true })
    } catch (error) {
      setErrorMessage(error.message || 'Unable to delete this goal.')
      setIsDeleting(false)
    }
  }

  return (
    <main className="product-page">
      <ProductHeader backTo="/goals" backLabel="All goals" />
      <section className="product-content page-wrap goal-detail-content">
        {isLoading && <div className="goals-state" role="status"><span className="auth-loading__spinner" /> Loading goal...</div>}
        {!isLoading && errorMessage && !goal && (
          <div className="goals-error" role="alert"><p>{errorMessage}</p><button className="button button--quiet" type="button" onClick={() => navigate('/goals')}>Back to goals</button></div>
        )}
        {!isLoading && goal && (
          <>
            <p className="eyebrow">Goal details</p>
            <div className="goal-detail-heading">
              <div>
                <h1>{goal.title}</h1>
                <div className="goal-detail-heading__badges">
                  <span className={`goal-status goal-status--${goal.status}`}>{goal.status}</span>
                  <GoalHealthIndicator goalId={goal.id} />
                  <span className={`goal-priority goal-priority--${goal.priority}`}>{goal.priority} priority</span>
                  {goal.category && <span className="goal-category">{goal.category}</span>}
                </div>
              </div>
              <div className="goal-detail-actions">
                <button className="button button--quiet" type="button" onClick={() => setIsEditing(true)}><Pencil size={15} /> Edit Goal</button>
                <details className="action-menu">
                  <summary className="roadmap-icon-button" aria-label="More goal actions"><MoreHorizontal size={17} /></summary>
                  <div className="action-menu__panel"><button type="button" onClick={handleDelete} disabled={isDeleting}><Trash2 size={15} /> {isDeleting ? 'Deleting...' : 'Delete Goal'}</button></div>
                </details>
              </div>
            </div>
            {errorMessage && <p className="goal-form__error" role="alert">{errorMessage}</p>}
            {goal.description && <p className="goal-detail-description">{goal.description}</p>}
            <section className="goal-derived-progress" aria-label="Roadmap completion">
              <header><h2>Roadmap completion</h2>{progressError && <span role="status">{progressError}</span>}</header>
              {progressData
                ? <ProgressBar label={goal.title} progress={progressData.goal.progress} hasEvidence={progressData.goal.hasEvidence} state={progressData.goal.state} noEvidenceLabel="No roadmap skills checked complete yet" />
                : progressLoading
                  ? <div className="derived-progress__loading" role="status"><span className="auth-loading__spinner" /> Calculating progress...</div>
                  : <p className="derived-progress__loading" role="status">Calculated progress is unavailable.</p>}
            </section>
            <section className="goal-overview" aria-label="Goal overview">
              <div className="goal-overview__dates">
                <div><CalendarDays size={17} /><span>Target date<strong>{formatDate(goal.target_date)}</strong></span></div>
                <div><Clock3 size={17} /><span>Created<strong>{formatDate(goal.created_at)}</strong></span></div>
              </div>
            </section>
            <RoadmapBuilder goalId={goal.id} progressData={progressData} onRegisterEditor={registerRoadmapEditor} onProgressChange={refreshProgress} />
          </>
        )}
      </section>
      <footer className="dashboard-footer">Set. Plan. Act. Track. Grow. <span>Organized by GNANEX</span></footer>
      {isEditing && goal && <GoalForm goal={goal} onCancel={() => setIsEditing(false)} onSubmit={handleUpdate} onEditRoadmap={() => { setIsEditing(false); editRoadmapRef.current?.() }} />}
    </main>
  )
}

export default GoalDetailPage
