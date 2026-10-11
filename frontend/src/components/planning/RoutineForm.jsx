import { useState } from 'react'
import { X } from 'lucide-react'

const weekdays = [
  ['1', 'Mon'], ['2', 'Tue'], ['3', 'Wed'], ['4', 'Thu'], ['5', 'Fri'], ['6', 'Sat'], ['0', 'Sun'],
]
const categories = ['health', 'education', 'practice', 'personal', 'family', 'rest', 'other']

export function RoutineForm({ routine, onCancel, onSubmit }) {
  const isEditing = Boolean(routine)
  const [frequency, setFrequency] = useState(routine?.frequency || 'daily')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    const data = new FormData(event.currentTarget)
    const days = frequency === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : data.getAll('days_of_week').map(Number)
    if (frequency === 'weekly' && days.length === 0) {
      setError('Choose at least one day for this routine.')
      return
    }
    const minutes = data.get('estimated_minutes')
    setIsSaving(true)
    try {
      await onSubmit({
        title: data.get('title').trim(),
        description: data.get('description').trim() || null,
        frequency,
        days_of_week: days,
        estimated_minutes: minutes ? Number(minutes) : null,
        category: data.get('category'),
      })
    } catch (submitError) {
      setError(submitError.message || 'Unable to save this routine.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="goal-modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !isSaving) onCancel()
    }}>
      <section className="goal-modal planning-modal" role="dialog" aria-modal="true" aria-labelledby="routine-form-title">
        <header className="goal-modal__header"><div><p className="eyebrow">Part of your normal week</p><h2 id="routine-form-title">{isEditing ? 'Edit routine' : 'Add a routine'}</h2></div><button className="goal-icon-button" type="button" aria-label="Close routine form" onClick={onCancel} disabled={isSaving}><X size={18} /></button></header>
        <form className="goal-form" onSubmit={handleSubmit}>
          <label>Routine name <span aria-hidden="true">*</span><input name="title" type="text" maxLength="200" defaultValue={routine?.title || ''} placeholder="e.g. Workout" required autoFocus /></label>
          <label>Description<textarea name="description" rows="2" maxLength="5000" defaultValue={routine?.description || ''} placeholder="A little context, if useful" /></label>
          <div className="planning-form__row">
            <label>Frequency<select value={frequency} onChange={(event) => setFrequency(event.target.value)}><option value="daily">Every day</option><option value="weekly">Selected days</option></select></label>
            <label>Category<select name="category" defaultValue={routine?.category || 'other'}>{categories.map((category) => <option key={category} value={category}>{category[0].toUpperCase() + category.slice(1)}</option>)}</select></label>
          </div>
          {frequency === 'weekly' && <fieldset className="routine-days"><legend>Days</legend><div>{weekdays.map(([value, label]) => <label key={value}><input type="checkbox" name="days_of_week" value={value} defaultChecked={routine?.days_of_week?.includes(Number(value))} /><span>{label}</span></label>)}</div></fieldset>}
          <label>Estimated effort per occurrence (minutes)<input name="estimated_minutes" type="number" min="1" max="10080" step="1" defaultValue={routine?.estimated_minutes ?? ''} placeholder="e.g. 45" /></label>
          {error && <p className="goal-form__error" role="alert">{error}</p>}
          <footer className="goal-form__actions"><button className="button button--quiet" type="button" onClick={onCancel} disabled={isSaving}>Cancel</button><button className="button button--primary" type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Routine'}</button></footer>
        </form>
      </section>
    </div>
  )
}

export default RoutineForm