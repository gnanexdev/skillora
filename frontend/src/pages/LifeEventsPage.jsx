import { useEffect, useState } from 'react'
import { CalendarDays, MoreHorizontal, Plus } from 'lucide-react'
import ProductHeader from '../components/layout/ProductHeader.jsx'
import LifeEventForm from '../components/planning/LifeEventForm.jsx'
import lifeEventsApi from '../services/lifeEventsApi.js'

function localToday() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatDate(value, options = { month: 'short', day: 'numeric' }) {
  return new Intl.DateTimeFormat(undefined, options).format(new Date(`${value}T00:00:00`))
}

function dateLabel(event) {
  return event.start_date === event.end_date
    ? formatDate(event.start_date, { month: 'long', day: 'numeric', year: 'numeric' })
    : `${formatDate(event.start_date)} – ${formatDate(event.end_date, { month: 'short', day: 'numeric', year: 'numeric' })}`
}

function eventImpact(event) {
  return `${event.impact_level} impact`
}

export function LifeEventsPage() {
  const [events, setEvents] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [formEvent, setFormEvent] = useState(undefined)
  const [reload, setReload] = useState(0)
  const today = localToday()

  useEffect(() => {
    let active = true
    lifeEventsApi.list()
      .then(({ lifeEvents }) => { if (active) setEvents(lifeEvents) })
      .catch((requestError) => { if (active) setLoadError(requestError.message || 'Unable to load life events.') })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [today, reload])

  const upcomingEvents = events.filter((lifeEvent) => lifeEvent.end_date >= today)
  const recentEvents = events.filter((lifeEvent) => lifeEvent.end_date < today).slice().reverse().slice(0, 8)

  const saveEvent = async (values) => {
    if (formEvent) {
      const { lifeEvent } = await lifeEventsApi.update(formEvent.id, values)
      setEvents((current) => current.map((item) => item.id === lifeEvent.id ? lifeEvent : item).sort((left, right) => left.start_date.localeCompare(right.start_date)))
    } else {
      const { lifeEvent } = await lifeEventsApi.create(values)
      if (lifeEvent.end_date >= today) setEvents((current) => [...current, lifeEvent].sort((left, right) => left.start_date.localeCompare(right.start_date)))
    }
    setFormEvent(undefined)
  }

  const deleteEvent = async (lifeEvent) => {
    if (!window.confirm(`Delete “${lifeEvent.title}”?`)) return
    try {
      await lifeEventsApi.remove(lifeEvent.id)
      setEvents((current) => current.filter((item) => item.id !== lifeEvent.id))
    } catch (deleteError) { setError(deleteError.message || 'Unable to delete this event.') }
  }

  return (
    <main className="product-page planning-page">
      <ProductHeader />
      <section className="product-content page-wrap context-page">
        <header className="planning-heading"><div><h1>Life Context</h1><p>Exams, travel, events, and other important commitments.</p></div><button className="button button--primary" type="button" onClick={() => setFormEvent(null)}><Plus size={16} /> Add context</button></header>
        {(error || loadError) && <div className="goals-error" role="alert"><p>{error || loadError}</p>{loadError && <button className="button button--quiet" type="button" onClick={() => { setIsLoading(true); setLoadError(''); setReload((value) => value + 1) }}>Try again</button>}</div>}
        {isLoading && <div className="goals-state" role="status"><span className="auth-loading__spinner" /> Loading...</div>}
        {!isLoading && !loadError && events.length === 0 && <section className="planning-empty"><span className="goals-empty__icon"><CalendarDays size={20} /></span><h2>No context added</h2><p>Add an exam, trip, family function, or another important circumstance.</p><button className="button button--primary" type="button" onClick={() => setFormEvent(null)}><Plus size={16} /> Add context</button></section>}
        {!isLoading && !loadError && events.length > 0 && <>
          <section className="context-list-section"><header><div><h2>Upcoming</h2></div><span>{upcomingEvents.length}</span></header>
            {upcomingEvents.length > 0 ? <div className="event-list">{upcomingEvents.map((lifeEvent) => <article className="event-row" key={lifeEvent.id}><div className="event-row__date"><CalendarDays size={15} /><span>{dateLabel(lifeEvent)}</span></div><div className="event-row__main"><h3>{lifeEvent.title}</h3><p>{lifeEvent.description || lifeEvent.event_type[0].toUpperCase() + lifeEvent.event_type.slice(1)}</p><span className={`event-impact event-impact--${lifeEvent.impact_level}`}>{eventImpact(lifeEvent)}</span></div><details className="action-menu"><summary className="roadmap-icon-button" aria-label={`Actions for ${lifeEvent.title}`}><MoreHorizontal size={17} /></summary><div className="action-menu__panel"><button type="button" onClick={() => setFormEvent(lifeEvent)}>Edit</button><button className="is-danger" type="button" onClick={() => deleteEvent(lifeEvent)}>Delete</button></div></details></article>)}</div> : <p className="context-empty">No upcoming context.</p>}
          </section>
          {recentEvents.length > 0 && <section className="context-list-section"><header><div><h2>Past / Recent</h2></div></header><div className="event-list">{recentEvents.map((lifeEvent) => <article className="event-row event-row--past" key={lifeEvent.id}><div className="event-row__date"><CalendarDays size={15} /><span>{dateLabel(lifeEvent)}</span></div><div className="event-row__main"><h3>{lifeEvent.title}</h3><p>{lifeEvent.description || lifeEvent.event_type[0].toUpperCase() + lifeEvent.event_type.slice(1)}</p><span className={`event-impact event-impact--${lifeEvent.impact_level}`}>{eventImpact(lifeEvent)}</span></div><details className="action-menu"><summary className="roadmap-icon-button" aria-label={`Actions for ${lifeEvent.title}`}><MoreHorizontal size={17} /></summary><div className="action-menu__panel"><button type="button" onClick={() => setFormEvent(lifeEvent)}>Edit</button><button className="is-danger" type="button" onClick={() => deleteEvent(lifeEvent)}>Delete</button></div></details></article>)}</div></section>}
        </>}
      </section>
      <footer className="dashboard-footer">Set. Plan. Act. Track. Grow. <span>Organized by GNANEX</span></footer>
      {formEvent !== undefined && <LifeEventForm lifeEvent={formEvent || undefined} onCancel={() => setFormEvent(undefined)} onSubmit={saveEvent} />}
    </main>
  )
}

export default LifeEventsPage