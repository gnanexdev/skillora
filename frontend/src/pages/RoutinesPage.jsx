import { useEffect, useState } from 'react'
import { Check, MoreHorizontal, Plus, RotateCcw } from 'lucide-react'
import ProductHeader from '../components/layout/ProductHeader.jsx'
import RoutineForm from '../components/planning/RoutineForm.jsx'
import routinesApi from '../services/routinesApi.js'

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function localToday() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function frequencyLabel(routine) {
  if (routine.frequency === 'daily') return 'Every day'
  return routine.days_of_week.map((day) => dayNames[day]).join(' · ')
}

function RoutineRow({ routine, onToggle, onEdit, onPause, onDelete, busy }) {
  return (
    <article className={`routine-row${routine.is_completed ? ' routine-row--completed' : ''}`}>
      {routine.is_scheduled_today && routine.is_active
        ? <button className={`task-card__check${routine.is_completed ? ' is-checked' : ''}`} type="button" aria-label={`${routine.is_completed ? 'Mark' : 'Complete'} ${routine.title}`} aria-pressed={routine.is_completed} disabled={busy} onClick={() => onToggle(routine)}>{routine.is_completed && <Check size={14} />}</button>
        : <span className="routine-row__marker" aria-hidden="true" />}
      <div className="routine-row__body"><h3>{routine.title}</h3><p>{routine.description || `${frequencyLabel(routine)}${routine.estimated_minutes ? ` · about ${routine.estimated_minutes} min` : ''}`}</p></div>
      <details className="action-menu"><summary className="roadmap-icon-button" aria-label={`Actions for ${routine.title}`}><MoreHorizontal size={17} /></summary><div className="action-menu__panel"><button type="button" onClick={() => onEdit(routine)}>Edit</button><button type="button" onClick={() => onPause(routine)}>{routine.is_active ? 'Pause' : 'Resume'}</button><button className="is-danger" type="button" onClick={() => onDelete(routine)}>Delete</button></div></details>
    </article>
  )
}

export function RoutinesPage() {
  const [routines, setRoutines] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [formRoutine, setFormRoutine] = useState(undefined)
  const [busyId, setBusyId] = useState('')
  const [reload, setReload] = useState(0)
  const today = localToday()

  useEffect(() => {
    let active = true
    Promise.all([
      routinesApi.list({ include_inactive: 'true' }),
      routinesApi.list({ date: today }),
    ])
      .then(([{ routines: allItems }, { routines: todayItems }]) => {
        if (active) {
          const todayIds = new Map(todayItems.map((routine) => [routine.id, routine.is_completed]))
          setRoutines(allItems.map((routine) => ({ ...routine, is_scheduled_today: todayIds.has(routine.id), is_completed: todayIds.get(routine.id) || false })))
        }
      })
      .catch((requestError) => { if (active) setLoadError(requestError.message || 'Unable to load routines.') })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [today, reload])

  const saveRoutine = async (values) => {
    if (formRoutine) {
      const { routine } = await routinesApi.update(formRoutine.id, values)
      const todayResult = await routinesApi.list({ date: today })
      const todayIds = new Map(todayResult.routines.map((item) => [item.id, item.is_completed]))
      setRoutines((current) => current.map((item) => item.id === routine.id ? { ...routine, is_scheduled_today: todayIds.has(routine.id), is_completed: todayIds.get(routine.id) || false } : item))
    } else {
      const { routine } = await routinesApi.create(values)
      const todayResult = await routinesApi.list({ date: today })
      const todayIds = new Map(todayResult.routines.map((item) => [item.id, item.is_completed]))
      setRoutines((current) => [...current, { ...routine, is_scheduled_today: todayIds.has(routine.id), is_completed: todayIds.get(routine.id) || false }].sort((left, right) => left.title.localeCompare(right.title)))
    }
    setFormRoutine(undefined)
  }

  const toggleRoutine = async (routine) => {
    setBusyId(routine.id)
    setError('')
    try {
      await routinesApi.setOccurrence(routine.id, today, !routine.is_completed)
      setRoutines((current) => current.map((item) => item.id === routine.id ? { ...item, is_completed: !item.is_completed } : item))
    } catch (updateError) {
      setError(updateError.message || 'Unable to update this routine.')
    } finally { setBusyId('') }
  }

  const updateActive = async (routine) => {
    try {
      const { routine: updated } = await routinesApi.update(routine.id, { is_active: !routine.is_active })
      setRoutines((current) => current.map((item) => item.id === updated.id ? { ...item, ...updated, is_completed: item.is_completed } : item))
    } catch (updateError) { setError(updateError.message || 'Unable to update this routine.') }
  }

  const deleteRoutine = async (routine) => {
    if (!window.confirm(`Delete “${routine.title}”? Its completion history will also be removed.`)) return
    try {
      await routinesApi.remove(routine.id)
      setRoutines((current) => current.filter((item) => item.id !== routine.id))
    } catch (deleteError) { setError(deleteError.message || 'Unable to delete this routine.') }
  }

  return (
    <main className="product-page planning-page">
      <ProductHeader />
      <section className="product-content page-wrap context-page">
        <header className="planning-heading"><div><h1>Manage Daily Rhythm</h1></div><button className="button button--primary" type="button" onClick={() => setFormRoutine(null)}><Plus size={16} /> Add</button></header>
          {(error || loadError) && <div className="goals-error" role="alert"><p>{error || loadError}</p>{loadError && <button className="button button--quiet" type="button" onClick={() => { setIsLoading(true); setLoadError(''); setReload((value) => value + 1) }}>Try again</button>}</div>}
        {isLoading && <div className="goals-state" role="status"><span className="auth-loading__spinner" /> Loading routines...</div>}
          {!isLoading && !loadError && routines.length === 0 && <section className="planning-empty"><span className="goals-empty__icon"><RotateCcw size={20} /></span><h2>No routines yet</h2><p>Add recurring activities that are part of your day.</p><button className="button button--primary" type="button" onClick={() => setFormRoutine(null)}><Plus size={16} /> Add a routine</button></section>}
          {!isLoading && !loadError && routines.length > 0 && <>
          <section className="context-list-section"><header><div><h2>Your routines</h2></div></header>
            <div className="routine-list">{routines.map((routine) => <RoutineRow key={routine.id} routine={routine} onToggle={toggleRoutine} onEdit={setFormRoutine} onPause={updateActive} onDelete={deleteRoutine} busy={busyId === routine.id} />)}</div>
          </section>
        </>}
      </section>
      <footer className="dashboard-footer">Set. Plan. Act. Track. Grow. <span>Organized by GNANEX</span></footer>
      {formRoutine !== undefined && <RoutineForm routine={formRoutine || undefined} onCancel={() => setFormRoutine(undefined)} onSubmit={saveRoutine} />}
    </main>
  )
}

export default RoutinesPage