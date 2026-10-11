import { useState } from 'react'
import { ArrowRight, Check, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import planningSuggestionsApi from '../../services/planningSuggestionsApi.js'

function relatedContext(recommendation) {
  if (recommendation.context.task_title) return recommendation.context.task_title
  if (recommendation.context.event_title) return recommendation.context.event_title
  return ''
}

export function PlanningSuggestions({ recommendations, onChange, compact = false }) {
  const [editingId, setEditingId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')

  if (!recommendations.length) return null

  const startModify = (recommendation) => {
    setEditingId(recommendation.id)
    setDueDate(recommendation.suggested_action.due_date || '')
    setError('')
  }

  const act = async (recommendation, status, modifiedDate) => {
    setBusyId(recommendation.id)
    setError('')
    try {
      const values = status === 'modified' ? { status, due_date: modifiedDate } : { status }
      const result = await planningSuggestionsApi.update(recommendation.id, values)
      onChange(recommendation, result)
      setEditingId('')
    } catch (actionError) {
      setError(actionError.message || 'Unable to update this planning suggestion.')
    } finally {
      setBusyId('')
    }
  }

  return (
    <div className={`planning-suggestions${compact ? ' planning-suggestions--compact' : ''}`}>
      {recommendations.map((recommendation) => {
        const isEditing = editingId === recommendation.id
        const busy = busyId === recommendation.id
        const context = relatedContext(recommendation)
        return (
          <article className="planning-suggestion" key={recommendation.id}>
            <div className="planning-suggestion__body">
              <h3>{recommendation.title}</h3>
              <p>{recommendation.explanation}</p>
              {context && <span className="planning-suggestion__context">{context}</span>}
            </div>
            {compact
              ? <Link className="planning-suggestion__review" to="/week">Review in Plans <ArrowRight size={14} /></Link>
              : isEditing
                ? <form className="planning-suggestion__edit" onSubmit={(event) => { event.preventDefault(); act(recommendation, 'modified', dueDate) }}>
                  <label>Move task to<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} required /></label>
                  <button className="button button--primary" type="submit" disabled={busy || !dueDate}>{busy ? 'Saving...' : 'Save date'}</button>
                  <button className="roadmap-icon-button" type="button" aria-label="Cancel edit" onClick={() => setEditingId('')} disabled={busy}><X size={15} /></button>
                </form>
                : <div className="planning-suggestion__actions">
                  <button className="button button--quiet" type="button" onClick={() => act(recommendation, 'accepted')} disabled={busy}>{busy ? 'Saving...' : <><Check size={14} /> Accept</>}</button>
                  {recommendation.suggested_action.kind === 'move_task' && <button className="button button--quiet" type="button" onClick={() => startModify(recommendation)} disabled={busy}>Modify</button>}
                  <button className="planning-suggestion__ignore" type="button" onClick={() => act(recommendation, 'ignored')} disabled={busy}>Ignore</button>
                </div>}
          </article>
        )
      })}
      {error && <p className="planning-suggestions__error" role="alert">{error}</p>}
    </div>
  )
}

export default PlanningSuggestions