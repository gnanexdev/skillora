import { useState } from 'react'
import { Check, Clock3, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'

const statusLabels = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  skipped: 'Skipped',
}

function formatTaskDate(value) {
  if (!value) return null
  const date = new Date(`${value.slice(0, 10)}T00:00:00`)
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
}

export function TaskCard({ task, onUpdate, onEdit, onDelete, compact = false, showActions = true }) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState('')
  const isCompleted = task.status === 'completed'

  const updateStatus = async (status) => {
    setError('')
    setIsUpdating(true)
    try {
      await onUpdate(task, { status })
    } catch (updateError) {
      setError(updateError.message || 'Unable to update this task.')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <article className={`task-card ${isCompleted ? 'task-card--completed' : ''} ${compact ? 'task-card--compact' : ''}`}>
      <button className={`task-card__check ${isCompleted ? 'is-checked' : ''}`} type="button" aria-label={isCompleted ? `Reopen ${task.title}` : `Complete ${task.title}`} disabled={isUpdating} onClick={() => updateStatus(isCompleted ? 'pending' : 'completed')}>
        {isCompleted && <Check size={14} aria-hidden="true" />}
      </button>
      <div className="task-card__content">
        <h3>{task.title}</h3>
        {task.description && <p className="task-card__description">{task.description}</p>}
        <div className="task-card__meta">
          {task.goal_title && <span>{task.goal_title}</span>}
          {task.skill_name && <span>{task.skill_name}</span>}
          {task.due_date && <span>{formatTaskDate(task.due_date)}</span>}
          {task.estimated_minutes && <span><Clock3 size={12} aria-hidden="true" /> {task.estimated_minutes} min</span>}
          <span className={`task-priority task-priority--${task.priority}`}>{task.priority}</span>
        </div>
        {error && <p className="task-card__error" role="alert">{error}</p>}
      </div>
      {showActions && <div className="task-card__actions">
        <details className="action-menu">
          <summary className="roadmap-icon-button" aria-label={`Actions for ${task.title}`}><MoreHorizontal size={17} /></summary>
          <div className="action-menu__panel">
            <label>Status<select aria-label={`Status for ${task.title}`} value={task.status} disabled={isUpdating} onChange={(event) => updateStatus(event.target.value)}>
              {Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select></label>
            <button type="button" onClick={() => onEdit(task)}><Pencil size={15} /> Edit task</button>
            <button className="is-danger" type="button" onClick={() => onDelete(task)}><Trash2 size={15} /> Delete task</button>
          </div>
        </details>
      </div>}
    </article>
  )
}

export default TaskCard
