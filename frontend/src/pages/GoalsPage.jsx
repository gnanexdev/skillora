import { useEffect, useState } from 'react'
import { ArrowRight, CalendarDays, Plus, Target } from 'lucide-react'
import { Link } from 'react-router-dom'
import GoalForm from '../components/goals/GoalForm.jsx'
import GoalHealthIndicator from '../components/goals/GoalHealthIndicator.jsx'
import ProductHeader from '../components/layout/ProductHeader.jsx'
import goalsApi from '../services/goalsApi.js'

const statusFilters = [['all', 'All statuses'], ['active', 'Active'], ['paused', 'Paused'], ['completed', 'Completed'], ['archived', 'Archived']]
const priorityFilters = [['all', 'All priorities'], ['high', 'High'], ['medium', 'Medium'], ['low', 'Low']]

function formatDate(value) {
  if (!value) return null
  const date = new Date(`${value.slice(0, 10)}T00:00:00`)
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

function GoalCard({ goal }) {
  return (
    <Link className="goal-card" to={`/goals/${goal.id}`}>
      <div className="goal-card__topline">
        <span className={`goal-status goal-status--${goal.status}`}>{goal.status}</span>
        <GoalHealthIndicator goalId={goal.id} compact />
        <span className={`goal-priority goal-priority--${goal.priority}`}>{goal.priority} priority</span>
      </div>
      <h2>{goal.title}</h2>
      {goal.description && <p className="goal-card__description">{goal.description}</p>}
      <div className="goal-card__meta">
        {goal.category && <span>{goal.category}</span>}
        {goal.target_date && <span><CalendarDays size={14} aria-hidden="true" /> {formatDate(goal.target_date)}</span>}
      </div>
      <span className="goal-card__open">View goal <ArrowRight size={15} aria-hidden="true" /></span>
    </Link>
  )
}

export function GoalsPage() {
  const [goals, setGoals] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')

  const loadGoals = async () => {
    setErrorMessage('')
    try {
      const result = await goalsApi.list()
      setGoals(result.goals)
    } catch (error) {
      setErrorMessage(error.message || 'Unable to load goals.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    goalsApi.list()
      .then((result) => {
        if (active) setGoals(result.goals)
      })
      .catch((error) => {
        if (active) setErrorMessage(error.message || 'Unable to load goals.')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => { active = false }
  }, [])

  const handleCreate = async (values) => {
    const result = await goalsApi.create(values)
    setGoals((currentGoals) => [result.goal, ...currentGoals])
    setIsCreating(false)
  }

  const visibleGoals = goals.filter((goal) => (statusFilter === 'all' || goal.status === statusFilter)
    && (priorityFilter === 'all' || goal.priority === priorityFilter))

  return (
    <main className="product-page">
      <ProductHeader />
      <section className="product-content page-wrap">
        <header className="product-page-heading">
          <div>
            <p className="eyebrow">Your next steps</p>
            <h1>Your Goals</h1>
            <p>Turn what you want to achieve into a clear path forward.</p>
          </div>
          <button className="button button--primary" type="button" onClick={() => setIsCreating(true)}>
            <Plus size={17} aria-hidden="true" /> New Goal
          </button>
        </header>

        {goals.length > 0 && (
          <div className="goal-filters" aria-label="Goal filters">
            <label>Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>{statusFilters.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>Priority<select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>{priorityFilters.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <span>{visibleGoals.length} {visibleGoals.length === 1 ? 'goal' : 'goals'}</span>
          </div>
        )}

        {isLoading && <div className="goals-state" role="status"><span className="auth-loading__spinner" /> Loading your goals...</div>}
        {!isLoading && errorMessage && <div className="goals-error" role="alert"><p>{errorMessage}</p><button className="button button--quiet" type="button" onClick={loadGoals}>Try again</button></div>}
        {!isLoading && !errorMessage && goals.length === 0 && (
          <div className="goals-empty">
            <span className="goals-empty__icon"><Target size={21} /></span>
            <h2>No goals yet</h2>
            <p>Start with one meaningful goal and build your path from there.</p>
            <button className="button button--primary" type="button" onClick={() => setIsCreating(true)}><Plus size={17} /> Create your first goal</button>
          </div>
        )}
        {!isLoading && !errorMessage && goals.length > 0 && visibleGoals.length === 0 && (
          <div className="goals-empty"><h2>No goals match these filters</h2><p>Adjust status or priority to see more of your goals.</p></div>
        )}
        {!isLoading && !errorMessage && visibleGoals.length > 0 && (
          <div className="goals-grid">{visibleGoals.map((goal) => <GoalCard key={goal.id} goal={goal} />)}</div>
        )}
      </section>
      <footer className="dashboard-footer">Set. Plan. Act. Track. Grow. <span>Organized by GNANEX</span></footer>
      {isCreating && <GoalForm onCancel={() => setIsCreating(false)} onSubmit={handleCreate} />}
    </main>
  )
}

export default GoalsPage
