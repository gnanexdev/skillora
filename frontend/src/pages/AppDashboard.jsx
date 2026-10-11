import { useEffect, useState } from 'react'
import { Check, CheckSquare, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import ProductHeader from '../components/layout/ProductHeader.jsx'
import TaskCard from '../components/planning/TaskCard.jsx'
import tasksApi from '../services/tasksApi.js'
import routinesApi from '../services/routinesApi.js'
import lifeEventsApi from '../services/lifeEventsApi.js'
import RoutineForm from '../components/planning/RoutineForm.jsx'
import PlanningSuggestions from '../components/planning/PlanningSuggestions.jsx'
import planningSuggestionsApi from '../services/planningSuggestionsApi.js'

function localToday() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function nextLocalDate(value) {
  const date = new Date(`${value}T00:00:00`)
  date.setDate(date.getDate() + 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function eventDateLabel(event) {
  if (event.start_date === event.end_date) return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(`${event.start_date}T00:00:00`))
  return `${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(`${event.start_date}T00:00:00`))}–${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(`${event.end_date}T00:00:00`))}`
}

function formatToday(value) {
  return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(`${value}T00:00:00`))
}

export function AppDashboard() {
  const [tasks, setTasks] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [routines, setRoutines] = useState([])
  const [events, setEvents] = useState([])
  const [routinesLoading, setRoutinesLoading] = useState(true)
  const [eventsLoading, setEventsLoading] = useState(true)
  const [routineError, setRoutineError] = useState('')
  const [eventError, setEventError] = useState('')
  const [routineBusyId, setRoutineBusyId] = useState('')
  const [editingRoutine, setEditingRoutine] = useState(undefined)
  const [planningNotes, setPlanningNotes] = useState([])
  const [planningNotesError, setPlanningNotesError] = useState('')
  const today = localToday()
  const completedRoutines = routines.filter((routine) => routine.is_completed).length
  const routineProgress = routines.length ? Math.round(completedRoutines / routines.length * 100) : 0

  useEffect(() => {
    let active = true
    tasksApi.list({ due_date: localToday() })
      .then(({ tasks: todayTasks }) => { if (active) setTasks(todayTasks) })
      .catch((loadError) => { if (active) setError(loadError.message || 'Unable to load today’s tasks.') })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    routinesApi.list({ date: today })
      .then(({ routines: items }) => { if (active) setRoutines(items) })
      .catch((loadError) => { if (active) setRoutineError(loadError.message || 'Unable to load today’s rhythm.') })
      .finally(() => { if (active) setRoutinesLoading(false) })
    return () => { active = false }
  }, [today])

  useEffect(() => {
    let active = true
    planningSuggestionsApi.list({ date: today })
      .then(({ recommendations }) => { if (active) setPlanningNotes(recommendations) })
      .catch((loadError) => { if (active) setPlanningNotesError(loadError.message || 'Unable to load planning notes.') })
    return () => { active = false }
  }, [today])

  useEffect(() => {
    let active = true
    lifeEventsApi.list({ start_date: today, end_date: nextLocalDate(today) })
      .then(({ lifeEvents }) => { if (active) setEvents(lifeEvents) })
      .catch((loadError) => { if (active) setEventError(loadError.message || 'Unable to load important context.') })
      .finally(() => { if (active) setEventsLoading(false) })
    return () => { active = false }
  }, [today])

  const updateTask = async (task, changes) => {
    const { task: updated } = await tasksApi.update(task.id, changes)
    setTasks((current) => current.map((item) => item.id === updated.id ? updated : item))
  }

  const updateRoutine = async (routine) => {
    setRoutineBusyId(routine.id)
    try {
      await routinesApi.setOccurrence(routine.id, today, !routine.is_completed)
      setRoutines((current) => current.map((item) => item.id === routine.id ? { ...item, is_completed: !item.is_completed } : item))
    } catch (updateError) {
      setRoutineError(updateError.message || 'Unable to update this routine.')
    } finally { setRoutineBusyId('') }
  }

  const saveRoutine = async (values) => {
    if (editingRoutine) await routinesApi.update(editingRoutine.id, values)
    else await routinesApi.create(values)
    const { routines: items } = await routinesApi.list({ date: today })
    setRoutines(items)
    setEditingRoutine(undefined)
  }

  return (
    <main className="dashboard-page">
      <ProductHeader />
      <section className="dashboard-welcome page-wrap">
        <header className="today-heading">
          <div><p className="eyebrow">{formatToday(today)}</p><h1>Today</h1></div>
        </header>
        <section className="today-dashboard" aria-labelledby="today-task-title">
          <header><div><h2 id="today-task-title">Today’s Tasks</h2></div><Link className="button button--primary" to="/tasks"><Plus size={16} /> Add task</Link></header>
          {isLoading && <div className="goals-state" role="status"><span className="auth-loading__spinner" /> Loading today’s tasks...</div>}
          {!isLoading && error && <p className="today-dashboard__error" role="alert">{error}</p>}
          {!isLoading && !error && tasks.length === 0 && <div className="today-dashboard__empty"><CheckSquare size={20} /><h3>Nothing due today</h3><p>You're clear for now.</p></div>}
          {!isLoading && !error && tasks.length > 0 && <div className="task-list">{tasks.map((task) => <TaskCard key={task.id} task={task} onUpdate={updateTask} compact showActions={false} />)}</div>}
        </section>
        {!planningNotesError && planningNotes.length > 0 && <section className="today-planning-notes" aria-labelledby="today-planning-note-title"><header><h2 id="today-planning-note-title">Planning note</h2></header><PlanningSuggestions recommendations={planningNotes} compact onChange={(recommendation) => setPlanningNotes((current) => current.filter((item) => item.id !== recommendation.id))} /></section>}
        <section className="today-context" aria-labelledby="today-rhythm-title">
          <header className="daily-rhythm-header"><h2 id="today-rhythm-title">Daily Rhythm</h2>
            {!routinesLoading && !routineError && routines.length > 0 && <div className="daily-rhythm-progress"><span>{completedRoutines} of {routines.length} complete</span><strong>{routineProgress}%</strong><div className="daily-rhythm-progress__track" role="progressbar" aria-label="Daily Rhythm completion today" aria-valuemin="0" aria-valuemax="100" aria-valuenow={routineProgress}><span style={{ width: `${routineProgress}%` }} /></div></div>}
            <div className="daily-rhythm-actions"><button className="roadmap-icon-button" type="button" aria-label="Add a routine" title="Add a routine" onClick={() => setEditingRoutine(null)}><Plus size={16} /></button><Link className="text-link" to="/routines">Manage</Link></div>
          </header>
          {routinesLoading && <div className="goals-state" role="status"><span className="auth-loading__spinner" /> Loading...</div>}
          {!routinesLoading && routineError && <p className="today-dashboard__error" role="alert">{routineError}</p>}
          {!routinesLoading && !routineError && routines.length === 0 && <p className="today-context__empty">Nothing scheduled for today.</p>}
          {!routinesLoading && !routineError && routines.length > 0 && <>
            <div className="routine-list">{routines.map((routine) => <article className={`routine-row${routine.is_completed ? ' routine-row--completed' : ''}`} key={routine.id}>
              <button className={`task-card__check${routine.is_completed ? ' is-checked' : ''}`} type="button" aria-label={`${routine.is_completed ? 'Mark' : 'Complete'} ${routine.title}`} aria-pressed={routine.is_completed} disabled={routineBusyId === routine.id} onClick={() => updateRoutine(routine)}>{routine.is_completed && <Check size={14} />}</button>
              <div className="routine-row__body"><button className="routine-row__title" type="button" onClick={() => setEditingRoutine(routine)}>{routine.title}</button></div>
              <span className="routine-row__duration">{routine.estimated_minutes ? `${routine.estimated_minutes} min` : ''}</span>
            </article>)}</div>
          </>}
        </section>
        <section className="today-important-context" aria-labelledby="important-context-title">
          <header><h2 id="important-context-title">Important Context</h2><Link className="text-link" to="/life-context">View all</Link></header>
          {eventsLoading && <div className="goals-state" role="status"><span className="auth-loading__spinner" /> Loading...</div>}
          {!eventsLoading && eventError && <p className="today-dashboard__error" role="alert">{eventError}</p>}
          {!eventsLoading && !eventError && events.length === 0 && <p className="today-context__empty">Nothing important affecting today or tomorrow.</p>}
          {!eventsLoading && !eventError && events.length > 0 && <div className="today-event-list">{events.slice(0, 2).map((lifeEvent) => <article key={lifeEvent.id}><span>{eventDateLabel(lifeEvent)}</span><div><strong>{lifeEvent.title}</strong><span>{lifeEvent.impact_level} impact</span></div></article>)}</div>}
        </section>
      </section>
      <footer className="dashboard-footer">Set. Plan. Act. Track. Grow. <span>Organized by GNANEX</span></footer>
      {editingRoutine !== undefined && <RoutineForm routine={editingRoutine || undefined} onCancel={() => setEditingRoutine(undefined)} onSubmit={saveRoutine} />}
    </main>
  )
}

export default AppDashboard