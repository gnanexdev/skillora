import { useState } from 'react'
import { X } from 'lucide-react'

const priorities = ['low', 'medium', 'high']

export function GoalForm({ goal, onCancel, onSubmit, onEditRoadmap }) {
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const isEditing = Boolean(goal)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    const formData = new FormData(event.currentTarget)
    const title = formData.get('title').trim()
    const description = formData.get('description').trim()
    const category = formData.get('category').trim()
    const targetDate = formData.get('target_date')

    if (!title) {
      setErrorMessage('Add a title for your goal.')
      return
    }
    if (title.length > 160 || description.length > 5000 || category.length > 80) {
      setErrorMessage('Please shorten one or more fields and try again.')
      return
    }

    const changes = {
      title,
      description: description || null,
      category: category || null,
      target_date: targetDate || null,
      priority: formData.get('priority'),
      ...(isEditing ? { status: formData.get('status') } : {}),
    }

    setIsSaving(true)
    try {
      await onSubmit(changes)
    } catch (error) {
      setErrorMessage(error.message || 'Unable to save this goal. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="goal-modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !isSaving) onCancel()
    }}>
      <section className="goal-modal" role="dialog" aria-modal="true" aria-labelledby="goal-form-title">
        <header className="goal-modal__header">
          <div>
            <p className="eyebrow">Make a little progress</p>
            <h2 id="goal-form-title">{isEditing ? 'Edit goal' : 'New goal'}</h2>
          </div>
          <button className="goal-icon-button" type="button" aria-label="Close goal form" onClick={onCancel} disabled={isSaving}><X size={18} /></button>
        </header>
        <form className="goal-form" onSubmit={handleSubmit}>
          <label>Goal title <span aria-hidden="true">*</span>
            <input name="title" type="text" maxLength="160" defaultValue={goal?.title || ''} placeholder="What would you like to achieve?" required autoFocus />
          </label>
          <label>Description
            <textarea name="description" rows="3" maxLength="5000" defaultValue={goal?.description || ''} placeholder="Add a little context for your goal" />
          </label>
          <div className="goal-form__row">
            <label>Category
              <input name="category" type="text" maxLength="80" defaultValue={goal?.category || ''} placeholder="Career, learning..." />
            </label>
            <label>Priority
              <select name="priority" defaultValue={goal?.priority || 'medium'}>
                {priorities.map((priority) => <option key={priority} value={priority}>{priority[0].toUpperCase() + priority.slice(1)}</option>)}
              </select>
            </label>
          </div>
          <label>Target date
            <input name="target_date" type="date" defaultValue={goal?.target_date?.slice(0, 10) || ''} />
          </label>
          {isEditing && (
            <label>Status
              <select name="status" defaultValue={goal.status}>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </label>
          )}
          {errorMessage && <p className="goal-form__error" role="alert">{errorMessage}</p>}
          <footer className="goal-form__actions">
            {isEditing && onEditRoadmap && <button className="button button--quiet goal-form__roadmap-link" type="button" onClick={onEditRoadmap} disabled={isSaving}>Roadmap, milestones &amp; skills</button>}
            <button className="button button--quiet" type="button" onClick={onCancel} disabled={isSaving}>Cancel</button>
            <button className="button button--primary" type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Goal'}</button>
          </footer>
        </form>
      </section>
    </div>
  )
}

export default GoalForm
