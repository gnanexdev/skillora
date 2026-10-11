import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Clock3, Pencil, Plus, Trash2 } from 'lucide-react'
import ProductHeader from '../components/layout/ProductHeader.jsx'
import TaskCard from '../components/planning/TaskCard.jsx'
import TaskForm from '../components/planning/TaskForm.jsx'
import WeeklyPlanForm from '../components/planning/WeeklyPlanForm.jsx'
import PlanningSuggestions from '../components/planning/PlanningSuggestions.jsx'
import tasksApi from '../services/tasksApi.js'
import weeklyPlansApi from '../services/weeklyPlansApi.js'
import planningSuggestionsApi from '../services/planningSuggestionsApi.js'
import routinesApi from '../services/routinesApi.js'
import lifeEventsApi from '../services/lifeEventsApi.js'

function shiftDate(value, delta) {
  const date = new Date(`${value}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + delta)
  return date.toISOString().slice(0, 10)
}

function formatDate(value, options = { month: 'long', day: 'numeric' }) {
  return new Intl.DateTimeFormat(undefined, options).format(new Date(`${value}T00:00:00`))
}

function dateRange(start, end) {
  const first = formatDate(start)
  const last = formatDate(end, { month: 'long', day: 'numeric', year: 'numeric' })
  return `${first} – ${last}`
}

export function WeekPage() {
  const [searchParams] = useSearchParams()
  const [weekStart, setWeekStart] = useState('')
  const [currentWeekStart, setCurrentWeekStart] = useState('')
  const [weekEnd, setWeekEnd] = useState('')
  const [weekStartsOn, setWeekStartsOn] = useState(1)
  const [plan, setPlan] = useState(null)
  const [tasks, setTasks] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [isCreatingPlan, setIsCreatingPlan] = useState(false)
  const [isEditingPlan, setIsEditingPlan] = useState(false)
  const [isDeletingPlan, setIsDeletingPlan] = useState(false)
  const [isCreatingTask, setIsCreatingTask] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [routines, setRoutines] = useState([])
  const [lifeEvents, setLifeEvents] = useState([])
  const [contextLoadedFor, setContextLoadedFor] = useState('')
  const [contextErrorState, setContextErrorState] = useState({ key: '', message: '' })
  const [suggestions, setSuggestions] = useState([])
  const [suggestionsLoadedFor, setSuggestionsLoadedFor] = useState('')
  const [suggestionsErrorState, setSuggestionsErrorState] = useState({ weekStart: '', message: '' })
  const [suggestionVersion, setSuggestionVersion] = useState(0)

  useEffect(() => {
    let active = true
    weeklyPlansApi.current()
      .then((result) => {
        if (!active) return
        const requestedWeek = searchParams.get('week_start_date')
        setWeekStart(requestedWeek || result.week_start_date)
        setCurrentWeekStart(result.week_start_date)
        setWeekEnd(requestedWeek ? shiftDate(requestedWeek, 6) : result.week_end_date)
        setWeekStartsOn(result.week_starts_on)
      })
      .catch((loadError) => {
        if (active) {
          setError(loadError.message || 'Unable to determine your current week.')
          setIsLoading(false)
        }
      })
    return () => { active = false }
  }, [reloadKey, searchParams])

  useEffect(() => {
    if (!weekStart) return undefined
    let active = true
    weeklyPlansApi.list({ week_start_date: weekStart })
      .then(async ({ weeklyPlans }) => {
        if (!active) return
        const currentPlan = weeklyPlans[0] || null
        setPlan(currentPlan)
        setWeekEnd(currentPlan?.week_end_date || shiftDate(weekStart, 6))
        if (!currentPlan) {
          setTasks([])
          return
        }
        const { tasks: planTasks } = await tasksApi.listForPlan(currentPlan.id)
        if (active) setTasks(planTasks)
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || 'Unable to load this week.')
      })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [weekStart, reloadKey])

  useEffect(() => {
    if (!weekStart || !weekEnd) return undefined
    let active = true
    const contextKey = `${weekStart}:${weekEnd}`
    Promise.all([
      routinesApi.list(),
      lifeEventsApi.list({ start_date: weekStart, end_date: weekEnd }),
    ])
      .then(([routineResult, eventResult]) => {
        if (!active) return
        setRoutines(routineResult.routines)
        setLifeEvents(eventResult.lifeEvents)
      })
      .catch((loadError) => { if (active) setContextErrorState({ key: contextKey, message: loadError.message || 'Unable to load routine and event estimates.' }) })
      .finally(() => { if (active) setContextLoadedFor(contextKey) })
    return () => { active = false }
  }, [weekStart, weekEnd, reloadKey])

  useEffect(() => {
    if (!weekStart) return undefined
    let active = true
    planningSuggestionsApi.list({ week_start_date: weekStart })
      .then(({ recommendations }) => { if (active) setSuggestions(recommendations) })
      .catch((loadError) => { if (active) { setSuggestions([]); setSuggestionsErrorState({ weekStart, message: loadError.message || 'Unable to load planning suggestions.' }) } })
      .finally(() => { if (active) setSuggestionsLoadedFor(weekStart) })
    return () => { active = false }
  }, [weekStart, suggestionVersion])

  const totalMinutes = useMemo(() => tasks.reduce((sum, task) => sum + (task.estimated_minutes || 0), 0), [tasks])
  const availableMinutes = (plan?.available_hours || 0) * 60
  const weekDates = weekStart ? Array.from({ length: 7 }, (_, index) => shiftDate(weekStart, index)) : []
  const routineMinutes = routines.reduce((total, routine) => {
    const plannedOccurrences = routine.frequency === 'daily'
      ? weekDates.length
      : weekDates.filter((date) => routine.days_of_week.includes(new Date(`${date}T00:00:00.000Z`).getUTCDay())).length
    return total + (routine.estimated_minutes || 0) * plannedOccurrences
  }, 0)
  const eventImpactMinutes = lifeEvents.reduce((total, lifeEvent) => {
    const affectedDays = weekDates.filter((date) => date >= lifeEvent.start_date && date <= lifeEvent.end_date).length
    return total + affectedDays * lifeEvent.estimated_daily_impact_minutes
  }, 0)
  const planningCapacityMinutes = Math.max(0, availableMinutes - routineMinutes - eventImpactMinutes)
  const remainingCapacityMinutes = Math.max(0, planningCapacityMinutes - totalMinutes)
  const contextKey = `${weekStart}:${weekEnd}`
  const contextLoading = Boolean(weekStart && weekEnd && contextLoadedFor !== contextKey)
  const contextError = contextErrorState.key === contextKey ? contextErrorState.message : ''
  const suggestionsLoading = Boolean(weekStart && suggestionsLoadedFor !== weekStart)
  const suggestionsError = suggestionsErrorState.weekStart === weekStart ? suggestionsErrorState.message : ''
  const groupedTasks = useMemo(() => {
    const groups = new Map()
    for (const task of tasks) {
      const key = task.due_date?.slice(0, 10) || 'unscheduled'
      groups.set(key, [...(groups.get(key) || []), task])
    }
    return [...groups.entries()].sort(([left], [right]) => {
      if (left === 'unscheduled') return 1
      if (right === 'unscheduled') return -1
      return left.localeCompare(right)
    })
  }, [tasks])

  const handleCreatePlan = async (values) => {
    const { weeklyPlan } = await weeklyPlansApi.create(values)
    setPlan(weeklyPlan)
    setTasks([])
    setWeekStart(weeklyPlan.week_start_date)
    setWeekEnd(weeklyPlan.week_end_date)
    setIsCreatingPlan(false)
    setNotice('Your weekly plan is ready.')
    setSuggestionVersion((value) => value + 1)
  }

  const handleUpdatePlan = async (values) => {
    const { weeklyPlan } = await weeklyPlansApi.update(plan.id, values)
    setPlan(weeklyPlan)
    setWeekStart(weeklyPlan.week_start_date)
    setWeekEnd(weeklyPlan.week_end_date)
    setIsEditingPlan(false)
    setNotice('Weekly plan updated.')
    setSuggestionVersion((value) => value + 1)
  }

  const handleDeletePlan = async () => {
    if (!window.confirm('Delete this weekly plan? Its tasks will be kept as unplanned tasks.')) return
    setIsDeletingPlan(true)
    setError('')
    try {
      await weeklyPlansApi.remove(plan.id)
      setPlan(null)
      setTasks([])
      setNotice('Weekly plan deleted.')
    } catch (deleteError) {
      setError(deleteError.message || 'Unable to delete this weekly plan.')
    } finally {
      setIsDeletingPlan(false)
    }
  }

  const handleCreateTask = async (values) => {
    const { task } = await tasksApi.createForPlan(plan.id, values)
    setTasks((current) => [...current, task].sort((left, right) => (left.due_date || '9999-12-31').localeCompare(right.due_date || '9999-12-31')))
    setIsCreatingTask(false)
    setNotice('Task added to your week.')
    setSuggestionVersion((value) => value + 1)
  }

  const handleUpdateTask = async (task, changes) => {
    const { task: updated } = await tasksApi.update(task.id, changes)
    setTasks((current) => current.map((item) => item.id === updated.id ? updated : item))
    setNotice(updated.status === 'completed' ? 'Task completed.' : 'Task updated.')
    setSuggestionVersion((value) => value + 1)
  }

  const handleEditTask = async (task, values) => {
    const { task: updated } = await tasksApi.update(task.id, values)
    setTasks((current) => current.map((item) => item.id === updated.id ? updated : item))
    setEditingTask(null)
    setNotice('Task updated.')
    setSuggestionVersion((value) => value + 1)
  }

  const handleDeleteTask = async (task) => {
    if (!window.confirm(`Delete “${task.title}”? This cannot be undone.`)) return
    try {
      await tasksApi.remove(task.id)
      setTasks((current) => current.filter((item) => item.id !== task.id))
      setNotice('Task deleted.')
      setSuggestionVersion((value) => value + 1)
    } catch (deleteError) {
      setError(deleteError.message || 'Unable to delete task.')
    }
  }

  const changeWeek = (days) => setWeekStart((value) => shiftDate(value, days))
  const navigateWeek = (days) => {
    setIsLoading(true)
    setError('')
    setNotice('')
    changeWeek(days)
  }

  const handleSuggestionChange = (_recommendation, result) => {
    setSuggestions((current) => current.filter((item) => item.id !== result.recommendation.id))
    if (result.affectedTask) {
      const remainsInWeek = result.affectedTask.due_date >= weekStart && result.affectedTask.due_date <= weekEnd
      setTasks((current) => remainsInWeek
        ? current.map((item) => item.id === result.affectedTask.id ? { ...item, ...result.affectedTask } : item)
        : current.filter((item) => item.id !== result.affectedTask.id))
      setNotice(result.recommendation.status === 'modified' ? 'Suggestion updated and applied.' : 'Suggestion accepted and applied.')
    } else if (result.recommendation.status === 'accepted') setNotice('Suggestion accepted.')
    setSuggestionVersion((value) => value + 1)
  }

  return (
    <main className="product-page planning-page">
      <ProductHeader />
      <section className="product-content page-wrap">
        <header className="planning-heading">
          <div><p className="eyebrow">Turn plans into action</p><h1>Weekly Planning</h1></div>
          <div className="week-navigation" aria-label="Week navigation">
            <button type="button" className="week-nav-button" aria-label="Previous week" disabled={!weekStart || isLoading} onClick={() => navigateWeek(-7)}><ArrowLeft size={17} /></button>
            <button type="button" className="button button--quiet week-nav-current" disabled={weekStart === currentWeekStart || isLoading} onClick={() => { setIsLoading(true); setError(''); setNotice(''); setWeekStart(currentWeekStart) }}>This Week</button>
            <button type="button" className="week-nav-button" aria-label="Next week" disabled={!weekStart || isLoading} onClick={() => navigateWeek(7)}><ArrowRight size={17} /></button>
          </div>
        </header>
        {weekStart && <div className="week-date-range"><CalendarDays size={16} /> Week: {dateRange(weekStart, weekEnd)} <span className="week-start-hint">Starts {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][weekStartsOn]}</span></div>}
        {notice && <p className="planning-notice" role="status"><CheckCircle2 size={15} /> {notice}</p>}
        {error && <div className="goals-error" role="alert"><p>{error}</p><button className="button button--quiet" type="button" onClick={() => { setIsLoading(true); setError(''); setReloadKey((value) => value + 1) }}>Try again</button></div>}
        {isLoading && <div className="goals-state" role="status"><span className="auth-loading__spinner" /> Loading weekly plan...</div>}
        {!isLoading && !error && !plan && (
          <section className="planning-empty"><span className="goals-empty__icon"><CalendarDays size={20} /></span><h2>No plan created for this week.</h2><p>Turn your goals into a focused set of actions for this week.</p><button className="button button--primary" type="button" onClick={() => setIsCreatingPlan(true)}><Plus size={16} /> Create Weekly Plan</button></section>
        )}
        {!isLoading && !error && (suggestionsLoading || suggestionsError || suggestions.length > 0) && <section className="planning-suggestions-section" aria-labelledby="planning-suggestions-title">
          <header><h2 id="planning-suggestions-title">Planning Suggestions</h2></header>
          {suggestionsLoading && <p className="planning-suggestions__loading" role="status">Checking your week...</p>}
          {!suggestionsLoading && suggestionsError && <p className="planning-suggestions__error" role="alert">{suggestionsError}</p>}
          {!suggestionsLoading && !suggestionsError && <PlanningSuggestions recommendations={suggestions} onChange={handleSuggestionChange} />}
        </section>}
        {!isLoading && !error && plan && (
          <>
            <section className="week-focus-row"><div><p className="eyebrow">This week's focus</p><h2>{plan.focus || 'Choose a focus for the week'}</h2><span>{plan.available_hours} estimated hours available</span></div><div className="week-focus-actions"><details className="action-menu"><summary className="roadmap-icon-button" aria-label="Weekly plan actions"><Pencil size={15} /></summary><div className="action-menu__panel"><button type="button" onClick={() => setIsEditingPlan(true)}><Pencil size={15} /> Edit plan</button><button className="is-danger" type="button" onClick={handleDeletePlan} disabled={isDeletingPlan}><Trash2 size={15} /> {isDeletingPlan ? 'Deleting...' : 'Delete plan'}</button></div></details><button className="button button--primary" type="button" onClick={() => setIsCreatingTask(true)}><Plus size={16} /> Add Task</button></div></section>
            <section className="weekly-summary weekly-summary--capacity" aria-label="Weekly effort estimate">
              <div><span>Available capacity</span><strong><Clock3 size={15} /> {contextLoading ? 'Loading' : contextError ? `${plan.available_hours}h` : `${Math.floor(planningCapacityMinutes / 60)}h ${planningCapacityMinutes % 60}m`}</strong></div>
              <div><span>Planned effort</span><strong>{Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m</strong></div>
              <div><span>Remaining estimated</span><strong>{contextLoading ? 'Loading' : contextError ? '—' : `${Math.floor(remainingCapacityMinutes / 60)}h ${remainingCapacityMinutes % 60}m`}</strong></div>
            </section>
            <section className="week-tasks-section"><header className="week-tasks-heading"><h2>Tasks</h2><span>{tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}</span></header>
              {tasks.length === 0 ? <div className="planning-empty planning-empty--small"><p>No tasks planned for this week yet.</p><button className="button button--quiet" type="button" onClick={() => setIsCreatingTask(true)}><Plus size={15} /> Add a task</button></div> : (
                <div className="day-groups">{groupedTasks.map(([day, dayTasks]) => <section className="day-group" key={day}><h3>{day === 'unscheduled' ? 'Unscheduled' : formatDate(day, { weekday: 'long', month: 'long', day: 'numeric' })}</h3><div className="task-list">{dayTasks.map((task) => <TaskCard key={task.id} task={task} onUpdate={handleUpdateTask} onEdit={setEditingTask} onDelete={handleDeleteTask} />)}</div></section>)}</div>
              )}
            </section>
          </>
        )}
      </section>
      <footer className="dashboard-footer">Set. Plan. Act. Track. Grow. <span>Organized by GNANEX</span></footer>
      {isCreatingPlan && <WeeklyPlanForm weekStartDate={weekStart} onCancel={() => setIsCreatingPlan(false)} onSubmit={handleCreatePlan} />}
      {isEditingPlan && plan && <WeeklyPlanForm plan={plan} onCancel={() => setIsEditingPlan(false)} onSubmit={handleUpdatePlan} />}
      {isCreatingTask && <TaskForm defaultDueDate={weekStart} onCancel={() => setIsCreatingTask(false)} onSubmit={handleCreateTask} />}
      {editingTask && <TaskForm task={editingTask} onCancel={() => setEditingTask(null)} onSubmit={(values) => handleEditTask(editingTask, values)} />}
    </main>
  )
}

export default WeekPage
