import { useState } from 'react'
import { X } from 'lucide-react'

export function WeeklyPlanForm({ plan, weekStartDate, onCancel, onSubmit }) {
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const isEditing = Boolean(plan)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    const data = new FormData(event.currentTarget)
    const focus = data.get('focus').trim()
    const hours = Number(data.get('available_hours'))
    if (!Number.isFinite(hours) || hours < 0 || hours > 168) {
      setError('Available hours must be between 0 and 168.')
      return
    }
    setIsSaving(true)
    try {
      await onSubmit({ week_start_date: data.get('week_start_date'), focus: focus || null, available_hours: hours, ...(isEditing ? {} : { status: 'planned' }) })
    } catch (submitError) {
      setError(submitError.message || 'Unable to create this weekly plan.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="goal-modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !isSaving) onCancel()
    }}>
      <section className="goal-modal planning-modal" role="dialog" aria-modal="true" aria-labelledby="weekly-plan-form-title">
        <header className="goal-modal__header"><div><p className="eyebrow">Make this week count</p><h2 id="weekly-plan-form-title">{isEditing ? 'Edit Weekly Plan' : 'Create Weekly Plan'}</h2></div><button className="goal-icon-button" type="button" aria-label="Close" onClick={onCancel} disabled={isSaving}><X size={18} /></button></header>
        <form className="goal-form" onSubmit={handleSubmit}>
          <label>Week starts on<input name="week_start_date" type="date" defaultValue={plan?.week_start_date || weekStartDate} required /></label>
          <label>Focus<input name="focus" type="text" maxLength="500" defaultValue={plan?.focus || ''} placeholder="What matters most this week?" /></label>
          <label>Available capacity (hours)<input name="available_hours" type="number" min="0" max="168" step="0.5" defaultValue={plan?.available_hours ?? 10} required /></label>
          {error && <p className="goal-form__error" role="alert">{error}</p>}
          <footer className="goal-form__actions"><button className="button button--quiet" type="button" onClick={onCancel} disabled={isSaving}>Cancel</button><button className="button button--primary" type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Weekly Plan'}</button></footer>
        </form>
      </section>
    </div>
  )
}

export default WeeklyPlanForm
