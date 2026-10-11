import { useState } from 'react'
import { X } from 'lucide-react'

const formConfig = {
  roadmap: { heading: 'Roadmap', nameLabel: 'Title', nameKey: 'title', namePlaceholder: 'e.g. Become a confident presenter' },
  milestone: { heading: 'Milestone', nameLabel: 'Title', nameKey: 'title', namePlaceholder: 'e.g. Presentation fundamentals' },
  skill: { heading: 'Skill', nameLabel: 'Skill name', nameKey: 'name', namePlaceholder: 'e.g. Story structure' },
}

export function RoadmapForm({ kind, item, initialPosition = 1, onCancel, onSubmit }) {
  const config = formConfig[kind]
  const isEditing = Boolean(item)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    const form = new FormData(event.currentTarget)
    const name = form.get(config.nameKey).trim()
    const description = form.get('description').trim()
    const values = { [config.nameKey]: name, description: description || null }

    if (!name) {
      setError(`${config.nameLabel} is required.`)
      return
    }
    if (name.length > 160 || description.length > 5000) {
      setError('Please shorten one or more fields and try again.')
      return
    }

    if (kind !== 'roadmap') {
      const position = Number(form.get('position'))
      if (!Number.isSafeInteger(position) || position < 1) {
        setError('Position must be a positive whole number.')
        return
      }
      values.position = position
    }

    setIsSaving(true)
    try {
      await onSubmit(values)
    } catch (submitError) {
      setError(submitError.message || `Unable to save ${config.heading.toLowerCase()}.`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="goal-modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !isSaving) onCancel()
    }}>
      <section className="goal-modal roadmap-modal" role="dialog" aria-modal="true" aria-labelledby="roadmap-form-title">
        <header className="goal-modal__header">
          <div>
            <p className="eyebrow">Shape the next step</p>
            <h2 id="roadmap-form-title">{isEditing ? `Edit ${config.heading.toLowerCase()}` : `New ${config.heading.toLowerCase()}`}</h2>
          </div>
          <button className="goal-icon-button" type="button" aria-label="Close form" onClick={onCancel} disabled={isSaving}><X size={18} /></button>
        </header>
        <form className="goal-form" onSubmit={handleSubmit}>
          <label>{config.nameLabel} <span aria-hidden="true">*</span>
            <input name={config.nameKey} type="text" maxLength="160" defaultValue={item?.[config.nameKey] || ''} placeholder={config.namePlaceholder} required autoFocus />
          </label>
          <label>Description
            <textarea name="description" rows="3" maxLength="5000" defaultValue={item?.description || ''} placeholder="Add helpful context" />
          </label>
          {kind !== 'roadmap' && (
            <label>Position
              <input name="position" type="number" min="1" step="1" defaultValue={item?.position ?? initialPosition} required />
            </label>
          )}
          {error && <p className="goal-form__error" role="alert">{error}</p>}
          <footer className="goal-form__actions">
            <button className="button button--quiet" type="button" onClick={onCancel} disabled={isSaving}>Cancel</button>
            <button className="button button--primary" type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : isEditing ? 'Save Changes' : `Create ${config.heading}`}</button>
          </footer>
        </form>
      </section>
    </div>
  )
}

export default RoadmapForm
