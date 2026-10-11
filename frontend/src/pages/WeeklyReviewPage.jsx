import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Clock3, ListTodo } from 'lucide-react'
import { Link } from 'react-router-dom'
import ProductHeader from '../components/layout/ProductHeader.jsx'
import weeklyReviewsApi from '../services/weeklyReviewsApi.js'
import '../styles/weekly-review.css'

const REFLECTIONS = [
  { name: 'went_well', label: 'What went well?' },
  { name: 'difficult', label: 'What felt difficult?' },
  { name: 'learned', label: 'What did you learn?' },
  { name: 'improve_next_week', label: 'What would you like to improve next week?' },
  { name: 'notes', label: 'Notes', optional: true },
]

function shiftDate(value, days) {
  const date = new Date(`${value}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function formatDate(value, options = { month: 'short', day: 'numeric' }) {
  return new Intl.DateTimeFormat(undefined, { ...options, timeZone: 'UTC' })
    .format(new Date(`${value}T00:00:00.000Z`))
}

function emptyReflections(review) {
  return Object.fromEntries(REFLECTIONS.map(({ name }) => [name, review?.[name] || '']))
}

export function WeeklyReviewPage() {
  const [selectedWeek, setSelectedWeek] = useState('')
  const [data, setData] = useState(null)
  const [reflections, setReflections] = useState(emptyReflections(null))
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    weeklyReviewsApi.get(selectedWeek || undefined)
      .then((result) => {
        if (!active) return
        setData(result)
        setReflections(emptyReflections(result.review))
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || 'Unable to load this weekly review.')
      })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [selectedWeek, reloadKey])

  const week = data?.week
  const summary = data?.summary
  const changeWeek = (offset) => {
    if (!week) return
    setIsLoading(true)
    setError('')
    setSaved(false)
    setSelectedWeek(shiftDate(week.week_start_date, offset))
  }

  const showCurrentWeek = () => {
    setIsLoading(true)
    setError('')
    setSaved(false)
    setSelectedWeek('')
  }

  const retryLoad = () => {
    setIsLoading(true)
    setError('')
    setReloadKey((value) => value + 1)
  }

  const saveReview = async (event) => {
    event.preventDefault()
    if (!week) return
    setIsSaving(true)
    setError('')
    setSaved(false)
    try {
      const result = await weeklyReviewsApi.save({ week_start_date: week.week_start_date, ...reflections })
      setData((current) => ({ ...current, review: result.review }))
      setSaved(true)
    } catch (saveError) {
      setError(saveError.message || 'Unable to save your reflection.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="product-page weekly-review-page">
      <ProductHeader />
      <section className="product-content page-wrap weekly-review-content">
        <header className="planning-heading weekly-review-heading">
          <div><p className="eyebrow">Look back, then look ahead</p><h1>Weekly Review</h1></div>
          <div className="week-navigation" aria-label="Review week navigation">
            <button type="button" className="week-nav-button" aria-label="Previous week" disabled={!week || isLoading} onClick={() => changeWeek(-7)}><ArrowLeft size={17} /></button>
            <button type="button" className="button button--quiet week-nav-current" disabled={!week || week.is_current_week || isLoading} onClick={showCurrentWeek}>This Week</button>
            <button type="button" className="week-nav-button" aria-label="Next week" disabled={!week || isLoading} onClick={() => changeWeek(7)}><ArrowRight size={17} /></button>
          </div>
        </header>

        {week && <div className="week-date-range weekly-review-date"><CalendarDays size={16} />
          <span>{formatDate(week.week_start_date)} – {formatDate(week.week_end_date, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          <span className="week-start-hint">Week starts {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][week.week_starts_on]}</span>
        </div>}

        {error && <div className="goals-error" role="alert"><p>{error}</p><button className="button button--quiet" type="button" onClick={retryLoad}>Try again</button></div>}
        {isLoading && <div className="goals-state" role="status"><span className="auth-loading__spinner" /> Loading weekly review...</div>}

        {!isLoading && !error && data && (
          <>
            <section className="weekly-review-summary" aria-label="Week summary">
              <div><span>Planned tasks</span><strong><ListTodo size={16} /> {summary.total_planned_tasks}</strong></div>
              <div><span>Completed</span><strong>{summary.completed_tasks}</strong></div>
              <div><span>Unfinished</span><strong>{summary.unfinished_tasks}</strong></div>
              <div><span>Skipped</span><strong>{summary.skipped_tasks}</strong></div>
            </section>
            <p className="weekly-review-data-note">Task counts use their currently recorded status. Task-change history and historical goal progress snapshots are not stored, so reschedules and start/end goal progress are unavailable.</p>

            <div className="weekly-review-layout">
              <form className="weekly-reflection" onSubmit={saveReview}>
                <header className="weekly-review-section-heading"><div><p className="eyebrow">Your reflection</p><h2>{data.review ? 'Edit your reflection' : 'Make space to reflect'}</h2></div>
                  {data.review && <span className="weekly-review-edited">Saved {formatDate(data.review.updated_at.slice(0, 10), { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                </header>
                <div className="weekly-reflection-fields">
                  {REFLECTIONS.map(({ name, label, optional }) => (
                    <label className="weekly-reflection-field" key={name}>
                      <span>{label}{optional && <small> Optional</small>}</span>
                      <textarea
                        name={name}
                        value={reflections[name]}
                        maxLength={2000}
                        rows={name === 'notes' ? 3 : 4}
                        onChange={(event) => { setReflections((current) => ({ ...current, [name]: event.target.value })); setSaved(false) }}
                      />
                    </label>
                  ))}
                </div>
                <footer className="weekly-reflection-actions">
                  {saved && <span role="status"><CheckCircle2 size={15} /> Saved</span>}
                  <button className="button button--primary" type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : data.review ? 'Update reflection' : 'Save reflection'}</button>
                </footer>
              </form>

              <aside className="weekly-preparation" aria-labelledby="weekly-preparation-title">
                <p className="eyebrow">Next week</p>
                <h2 id="weekly-preparation-title">A few things to carry forward</h2>
                <ul>
                  <li>{data.preparation.unfinished_tasks > 0
                    ? `${data.preparation.unfinished_tasks} ${data.preparation.unfinished_tasks === 1 ? 'task is' : 'tasks are'} currently marked unfinished.`
                    : 'No tasks are currently marked unfinished.'}</li>
                  <li>{data.preparation.exceeds_planned_capacity === true
                    ? 'Recorded task estimates exceed the hours set aside in this plan.'
                    : data.preparation.exceeds_planned_capacity === false
                      ? 'Recorded task estimates fit within the hours set aside in this plan.'
                      : 'No weekly plan capacity estimate is recorded for this week.'}</li>
                </ul>
                <Link className="button button--quiet weekly-preparation-link" to={`/week?week_start_date=${encodeURIComponent(week.current_next_week_start_date)}`}>
                  <Clock3 size={15} /> Open next week in Plans
                </Link>
              </aside>
            </div>
          </>
        )}
      </section>
      <footer className="dashboard-footer">Set. Plan. Act. Track. Grow. <span>Organized by GNANEX</span></footer>
    </main>
  )
}

export default WeeklyReviewPage