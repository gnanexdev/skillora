import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import goalsApi from '../../services/goalsApi.js'
import roadmapApi from '../../services/roadmapApi.js'

const priorities = ['low', 'medium', 'high']
const statuses = [
  ['pending', 'Pending'],
  ['in_progress', 'In Progress'],
  ['completed', 'Completed'],
  ['skipped', 'Skipped'],
]

export function TaskForm({ task, defaultDueDate, onCancel, onSubmit }) {
  const isEditing = Boolean(task)
  const [goals, setGoals] = useState([])
  const [skills, setSkills] = useState([])
  const [selectedGoalId, setSelectedGoalId] = useState(task?.goal_id || '')
  const [selectedSkillId, setSelectedSkillId] = useState(task?.skill_id || '')
  const [isLoadingGoals, setIsLoadingGoals] = useState(true)
  const [loadedSkillsForGoal, setLoadedSkillsForGoal] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const isLoadingSkills = Boolean(selectedGoalId) && loadedSkillsForGoal !== selectedGoalId

  useEffect(() => {
    let active = true
    goalsApi.list()
      .then(({ goals: availableGoals }) => { if (active) setGoals(availableGoals) })
      .catch((loadError) => { if (active) setError(loadError.message || 'Unable to load goals.') })
      .finally(() => { if (active) setIsLoadingGoals(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    if (!selectedGoalId) {
      return () => { active = false }
    }
    roadmapApi.forGoal(selectedGoalId)
      .then(({ roadmap }) => {
        if (active) {
          setSkills((roadmap?.milestones || []).flatMap((milestone) => milestone.skills.map((skill) => ({ ...skill, milestone_title: milestone.title }))))
          setLoadedSkillsForGoal(selectedGoalId)
        }
      })
      .catch(() => {
        if (active) {
          setSkills([])
          setLoadedSkillsForGoal(selectedGoalId)
        }
      })
    return () => { active = false }
  }, [selectedGoalId])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    const data = new FormData(event.currentTarget)
    const title = data.get('title').trim()
    const description = data.get('description').trim()
    if (!title) {
      setError('Task title is required.')
      return
    }
    const minutesValue = data.get('estimated_minutes')
    const estimatedMinutes = minutesValue ? Number(minutesValue) : null
    if (estimatedMinutes !== null && (!Number.isInteger(estimatedMinutes) || estimatedMinutes <= 0)) {
      setError('Estimated effort must be a positive number of minutes.')
      return
    }
    const values = {
      title,
      description: description || null,
      goal_id: data.get('goal_id') || null,
      skill_id: data.get('skill_id') || null,
      due_date: data.get('due_date') || null,
      estimated_minutes: estimatedMinutes,
      priority: data.get('priority'),
      ...(isEditing ? { status: data.get('status') } : {}),
    }

    setIsSaving(true)
    try {
      await onSubmit(values)
    } catch (submitError) {
      setError(submitError.message || 'Unable to save this task.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="goal-modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !isSaving) onCancel()
    }}>
      <section className="goal-modal planning-modal" role="dialog" aria-modal="true" aria-labelledby="task-form-title">
        <header className="goal-modal__header">
          <div><p className="eyebrow">Daily execution</p><h2 id="task-form-title">{isEditing ? 'Edit task' : 'Add task'}</h2></div>
          <button className="goal-icon-button" type="button" aria-label="Close task form" onClick={onCancel} disabled={isSaving}><X size={18} /></button>
        </header>
        <form className="goal-form" onSubmit={handleSubmit}>
          <label>Task title <span aria-hidden="true">*</span><input name="title" type="text" maxLength="200" defaultValue={task?.title || ''} placeholder="What will you work on?" required autoFocus /></label>
          <label>Description<textarea name="description" rows="2" maxLength="5000" defaultValue={task?.description || ''} placeholder="Add a little detail" /></label>
          <div className="planning-form__row">
            <label>Goal
              <select name="goal_id" value={selectedGoalId} onChange={(event) => { setSelectedGoalId(event.target.value); setSelectedSkillId(''); if (!event.target.value) setSkills([]) }} disabled={isLoadingGoals}>
                <option value="">No goal</option>
                {goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}
              </select>
            </label>
            <label>Skill
              <select name="skill_id" value={selectedSkillId} onChange={(event) => setSelectedSkillId(event.target.value)} disabled={!selectedGoalId || isLoadingSkills}>
                <option value="">No skill</option>
                {skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.milestone_title} · {skill.name}</option>)}
              </select>
            </label>
          </div>
          {isLoadingSkills && <p className="planning-form__hint">Loading skills for this goal...</p>}
          <div className="planning-form__row planning-form__row--three">
            <label>Due date<input name="due_date" type="date" defaultValue={task?.due_date?.slice(0, 10) || defaultDueDate || ''} /></label>
            <label>Estimated effort (minutes)<input name="estimated_minutes" type="number" min="1" step="1" defaultValue={task?.estimated_minutes ?? ''} placeholder="60" /></label>
            <label>Priority<select name="priority" defaultValue={task?.priority || 'medium'}>{priorities.map((priority) => <option key={priority} value={priority}>{priority[0].toUpperCase() + priority.slice(1)}</option>)}</select></label>
          </div>
          {isEditing && <label>Status<select name="status" defaultValue={task.status}>{statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
          {error && <p className="goal-form__error" role="alert">{error}</p>}
          <footer className="goal-form__actions"><button className="button button--quiet" type="button" onClick={onCancel} disabled={isSaving}>Cancel</button><button className="button button--primary" type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Task'}</button></footer>
        </form>
      </section>
    </div>
  )
}

export default TaskForm
