import { useState } from 'react'
import { X } from 'lucide-react'

const eventTypes = ['exam', 'travel', 'family', 'college', 'event', 'holiday', 'personal', 'other']
const impactMinutes = { low: 60, medium: 180, high: 360 }

export function LifeEventForm({ lifeEvent, onCancel, onSubmit }) {
  const isEditing = Boolean(lifeEvent)
  const [impactLevel, setImpactLevel] = useState(lifeEvent?.impact_level || 'medium')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    const data = new FormData(event.currentTarget)
    const title = data.get('title').trim()
    const startDate = data.get('start_date')
    const endDate = data.get('end_date')
    const hours = Number(data.get('estimated_daily_impact_hours'))
    if (!title) return setError('Event name is required.')
    if (!startDate || !endDate || endDate < startDate) return setError('Choose valid dates, with the end date on or after the start date.')
    if (!Number.isFinite(hours) || hours < 0 || hours > 24) return setError('Daily impact must be between 0 and 24 hours.')
    setIsSaving(true)
    try {
      await onSubmit({
        title,
        description: data.get('description').trim() || null,
        event_type: data.get('event_type'),
        start_date: startDate,
        end_date: endDate,
        impact_level: impactLevel,
        estimated_daily_impact_minutes: Math.round(hours * 60),
      })
    } catch (submitError) {
      setError(submitError.message || 'Unable to save this life event.')
    } finally {
      setIsSaving(false)
    }
  }

  const defaultHours = ((lifeEvent?.estimated_daily_impact_minutes ?? impactMinutes[impactLevel]) / 60)

  return (
    <div className="goal-modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !isSaving) onCancel()
    }}>
      <section className="goal-modal planning-modal" role="dialog" aria-modal="true" aria-labelledby="life-event-form-title">
        <header className="goal-modal__header"><div><p className="eyebrow">Availability context</p><h2 id="life-event-form-title">{isEditing ? 'Edit life event' : 'Add a life event'}</h2></div><button className="goal-icon-button" type="button" aria-label="Close event form" onClick={onCancel} disabled={isSaving}><X size={18} /></button></header>
        <form className="goal-form" onSubmit={handleSubmit}>
          <label>Event name <span aria-hidden="true">*</span><input name="title" type="text" maxLength="200" defaultValue={lifeEvent?.title || ''} placeholder="e.g. Final exams" required autoFocus /></label>
          <label>Description<textarea name="description" rows="2" maxLength="5000" defaultValue={lifeEvent?.description || ''} placeholder="Optional context" /></label>
          <div className="planning-form__row">
            <label>Type<select name="event_type" defaultValue={lifeEvent?.event_type || 'other'}>{eventTypes.map((type) => <option key={type} value={type}>{type[0].toUpperCase() + type.slice(1)}</option>)}</select></label>
            <label>Planning impact<select value={impactLevel} onChange={(event) => setImpactLevel(event.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
          </div>
          <div className="planning-form__row">
            <label>Starts<input name="start_date" type="date" defaultValue={lifeEvent?.start_date || ''} required /></label>
            <label>Ends<input name="end_date" type="date" defaultValue={lifeEvent?.end_date || lifeEvent?.start_date || ''} required /></label>
          </div>
          <label>Estimated availability affected (hours per day)<input name="estimated_daily_impact_hours" type="number" min="0" max="24" step="0.5" defaultValue={defaultHours} required /><span className="planning-form__hint">A planning estimate, not a measure of work or productivity.</span></label>
          {error && <p className="goal-form__error" role="alert">{error}</p>}
          <footer className="goal-form__actions"><button className="button button--quiet" type="button" onClick={onCancel} disabled={isSaving}>Cancel</button><button className="button button--primary" type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Event'}</button></footer>
        </form>
      </section>
    </div>
  )
}

export default LifeEventForm