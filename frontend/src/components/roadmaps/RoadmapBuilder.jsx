import { useEffect, useState } from 'react'
import { ArrowDown, Check, Pencil, Plus, Route, Trash2 } from 'lucide-react'
import RoadmapForm from './RoadmapForm.jsx'
import roadmapApi from '../../services/roadmapApi.js'
import ProgressBar from '../progress/ProgressBar.jsx'

function StatusBadge({ status }) {
  return <span className={`roadmap-status roadmap-status--${status}`}>{status}</span>
}

export function RoadmapBuilder({ goalId, progressData, onRegisterEditor, onProgressChange }) {
  const [roadmap, setRoadmap] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState(null)
  const [isEditingRoadmap, setIsEditingRoadmap] = useState(false)
  const [isDeletingRoadmap, setIsDeletingRoadmap] = useState(false)
  const [updatingSkillId, setUpdatingSkillId] = useState('')

  useEffect(() => {
    let active = true
    roadmapApi.forGoal(goalId)
      .then(({ roadmap: loadedRoadmap }) => {
        if (active) setRoadmap(loadedRoadmap)
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || 'Unable to load this roadmap.')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => { active = false }
  }, [goalId])

  const announce = (message) => {
    setError('')
    setNotice(message)
  }

  const openForm = (kind, item = null, parentId = null) => {
    setIsEditingRoadmap(true)
    setForm({ kind, item, parentId })
  }

  useEffect(() => {
    onRegisterEditor?.(() => {
      setIsEditingRoadmap(true)
      setForm({ kind: 'roadmap', item: roadmap, parentId: null })
    })
  }, [onRegisterEditor, roadmap])

  const submitForm = async (values) => {
    if (form.kind === 'roadmap') {
      if (form.item) {
        const { roadmap: updatedRoadmap } = await roadmapApi.update(roadmap.id, values)
        setRoadmap((current) => ({ ...current, ...updatedRoadmap }))
        announce('Roadmap updated.')
      } else {
        const { roadmap: createdRoadmap } = await roadmapApi.createForGoal(goalId, values)
        setRoadmap(createdRoadmap)
        announce('Roadmap created.')
      }
    } else if (form.kind === 'milestone') {
      if (form.item) {
        const { milestone } = await roadmapApi.updateMilestone(form.item.id, values)
        setRoadmap((current) => ({
          ...current,
          milestones: current.milestones.map((entry) => entry.id === milestone.id
            ? { ...entry, ...milestone, status: entry.status, progress_percentage: entry.progress_percentage }
            : entry)
            .sort((left, right) => left.position - right.position),
        }))
        announce('Milestone updated.')
      } else {
        const { milestone } = await roadmapApi.createMilestone(roadmap.id, values)
        setRoadmap((current) => ({
          ...current,
          milestones: [...current.milestones, { ...milestone, skills: [] }].sort((left, right) => left.position - right.position),
        }))
        announce('Milestone added.')
      }
    } else if (form.item) {
      const { skill } = await roadmapApi.updateSkill(form.item.id, values)
      setRoadmap((current) => ({
        ...current,
        milestones: current.milestones.map((milestone) => milestone.id === form.parentId
          ? { ...milestone, skills: milestone.skills.map((entry) => entry.id === skill.id
            ? { ...entry, ...skill, status: entry.status, progress_percentage: entry.progress_percentage }
            : entry).sort((left, right) => left.position - right.position) }
          : milestone),
      }))
      announce('Skill updated.')
    } else {
      const { skill } = await roadmapApi.createSkill(form.parentId, values)
      setRoadmap((current) => ({
        ...current,
        milestones: current.milestones.map((milestone) => milestone.id === form.parentId
          ? { ...milestone, skills: [...milestone.skills, skill].sort((left, right) => left.position - right.position) }
          : milestone),
      }))
      announce('Skill added.')
    }
    setForm(null)
  }

  const removeRoadmap = async () => {
    if (!window.confirm('Delete this roadmap and all its milestones and skills? This cannot be undone.')) return
    setIsDeletingRoadmap(true)
    setError('')
    try {
      await roadmapApi.remove(roadmap.id)
      setRoadmap(null)
      announce('Roadmap deleted.')
    } catch (deleteError) {
      setError(deleteError.message || 'Unable to delete this roadmap.')
    } finally {
      setIsDeletingRoadmap(false)
    }
  }

  const removeMilestone = async (milestone) => {
    if (!window.confirm(`Delete “${milestone.title}” and its skills? This cannot be undone.`)) return
    setError('')
    try {
      await roadmapApi.removeMilestone(milestone.id)
      setRoadmap((current) => ({ ...current, milestones: current.milestones.filter((entry) => entry.id !== milestone.id) }))
      announce('Milestone deleted.')
    } catch (deleteError) {
      setError(deleteError.message || 'Unable to delete this milestone.')
    }
  }

  const removeSkill = async (milestoneId, skill) => {
    if (!window.confirm(`Delete “${skill.name}”? This cannot be undone.`)) return
    setError('')
    try {
      await roadmapApi.removeSkill(skill.id)
      setRoadmap((current) => ({
        ...current,
        milestones: current.milestones.map((milestone) => milestone.id === milestoneId
          ? { ...milestone, skills: milestone.skills.filter((entry) => entry.id !== skill.id) }
          : milestone),
      }))
      announce('Skill deleted.')
    } catch (deleteError) {
      setError(deleteError.message || 'Unable to delete this skill.')
    }
  }

  const setSkillCompletion = async (milestoneId, skill, completed) => {
    setUpdatingSkillId(skill.id)
    setError('')
    try {
      const { skill: updatedSkill } = await roadmapApi.setSkillCompletion(skill.id, completed)
      setRoadmap((current) => ({
        ...current,
        milestones: current.milestones.map((milestone) => milestone.id === milestoneId
          ? { ...milestone, skills: milestone.skills.map((entry) => entry.id === skill.id ? { ...entry, ...updatedSkill } : entry) }
          : milestone),
      }))
      await onProgressChange?.()
      announce(completed ? `${skill.name} marked complete.` : `${skill.name} marked incomplete.`)
    } catch (updateError) {
      setError(updateError.message || `Unable to update ${skill.name}.`)
    } finally {
      setUpdatingSkillId('')
    }
  }

  if (isLoading) return <div className="roadmap-loading" role="status"><span className="auth-loading__spinner" /> Loading roadmap...</div>

  if (error && !roadmap) {
    return <div className="roadmap-inline-error" role="alert"><p>{error}</p><button className="button button--quiet" type="button" onClick={() => window.location.reload()}>Try again</button></div>
  }

  if (!roadmap) {
    return (
      <section className="roadmap-empty">
        <span className="roadmap-empty__icon"><Route size={20} /></span>
        <div><h2>Build your roadmap</h2><p>Break this goal into milestones and skills so you always know what comes next.</p></div>
        <button className="button button--primary" type="button" onClick={() => openForm('roadmap')}><Plus size={16} /> Create Roadmap</button>
        {error && <p className="roadmap-inline-error" role="alert">{error}</p>}
        {form && <RoadmapForm kind={form.kind} onCancel={() => setForm(null)} onSubmit={submitForm} />}
      </section>
    )
  }

  return (
    <section className="roadmap-builder" aria-labelledby="roadmap-title">
      {notice && <p className="roadmap-notice" role="status"><Check size={15} /> {notice}</p>}
      {error && <p className="roadmap-inline-error" role="alert">{error}</p>}
      <header className="roadmap-heading">
        <div className="roadmap-heading__identity">
          <span className="roadmap-heading__icon"><Route size={20} /></span>
          <div><p className="eyebrow">Roadmap</p><h2 id="roadmap-title">{roadmap.title}</h2>{roadmap.description && <p>{roadmap.description}</p>}</div>
        </div>
        <div className="roadmap-heading__actions">
          {isEditingRoadmap ? (
            <>
              <button className="button button--quiet" type="button" onClick={() => setIsEditingRoadmap(false)}>Done</button>
              <button className="button button--danger" type="button" onClick={removeRoadmap} disabled={isDeletingRoadmap}><Trash2 size={15} /> {isDeletingRoadmap ? 'Deleting...' : 'Delete Roadmap'}</button>
            </>
          ) : <button className="button button--quiet" type="button" onClick={() => openForm('roadmap', roadmap)}><Pencil size={15} /> Edit Roadmap</button>}
        </div>
      </header>
      <div className="roadmap-section-heading"><div><h3>Milestones</h3><p>{roadmap.milestones.length} {roadmap.milestones.length === 1 ? 'step' : 'steps'} in this path</p></div>{isEditingRoadmap && <button className="button button--quiet" type="button" onClick={() => openForm('milestone', null, roadmap.id)}><Plus size={15} /> Add Milestone</button>}</div>
      {roadmap.milestones.length === 0 ? (
        <div className="roadmap-no-milestones"><p>No milestones yet. Add the first step in your roadmap.</p></div>
      ) : (
        <ol className="milestone-list">
          {roadmap.milestones.map((milestone, milestoneIndex) => {
            const calculatedMilestone = progressData?.milestones.find((item) => item.id === milestone.id)
            return (
              <li className="milestone-card" key={milestone.id}>
                <div className="milestone-card__rail"><span>{String(milestone.position).padStart(2, '0')}</span><span className="milestone-card__line" /></div>
                <div className="milestone-card__body">
                  <header className="milestone-card__header">
                    <div><div className="milestone-card__titleline"><h3>{milestone.title}</h3><StatusBadge status={calculatedMilestone?.status || 'pending'} /></div>{milestone.description && <p>{milestone.description}</p>}</div>
                    {isEditingRoadmap && <div className="roadmap-item-actions">
                      <button className="roadmap-icon-button" type="button" aria-label={`Edit ${milestone.title}`} onClick={() => openForm('milestone', milestone, roadmap.id)}><Pencil size={15} /></button>
                      <button className="roadmap-icon-button roadmap-icon-button--danger" type="button" aria-label={`Delete ${milestone.title}`} onClick={() => removeMilestone(milestone)}><Trash2 size={15} /></button>
                    </div>}
                  </header>
                  <ProgressBar label="Milestone progress" progress={calculatedMilestone?.progress ?? milestone.progress_percentage} hasEvidence={calculatedMilestone?.hasEvidence ?? milestone.skills.length > 0} state={calculatedMilestone?.state ?? (milestone.status === 'completed' ? 'completed' : milestone.progress_percentage > 0 ? 'in_progress' : milestone.skills.length ? 'started' : 'no_evidence')} compact />
                  <div className="skill-list">
                    {milestone.skills.map((skill) => {
                      const calculatedSkill = calculatedMilestone?.skills.find((item) => item.id === skill.id)
                      const isComplete = (calculatedSkill?.status || skill.status) === 'completed'
                      return (
                    <article className="skill-row" key={skill.id}>
                      <span className="skill-row__position">{String(skill.position).padStart(2, '0')}</span>
                      <div className={`skill-row__main ${isComplete ? 'is-complete' : ''}`}><div className="skill-row__title"><h4>{skill.name}</h4><span className="skill-row__status">{isComplete ? 'Complete' : 'Not complete'}</span></div>{skill.description && <p>{skill.description}</p>}
                      </div>
                      <div className="skill-row__controls">
                        <label className="skill-completion" title={isComplete ? `Mark ${skill.name} incomplete` : `Mark ${skill.name} complete`}>
                          <input type="checkbox" checked={isComplete} disabled={updatingSkillId === skill.id} onChange={(event) => setSkillCompletion(milestone.id, skill, event.target.checked)} aria-label={`Mark ${skill.name} complete`} />
                          <span className="skill-completion__box" aria-hidden="true">{isComplete && <Check size={14} />}</span>
                        </label>
                        {isEditingRoadmap && <div className="roadmap-item-actions"><button className="roadmap-icon-button" type="button" aria-label={`Edit ${skill.name}`} onClick={() => openForm('skill', skill, milestone.id)}><Pencil size={14} /></button><button className="roadmap-icon-button roadmap-icon-button--danger" type="button" aria-label={`Delete ${skill.name}`} onClick={() => removeSkill(milestone.id, skill)}><Trash2 size={14} /></button></div>}
                      </div>
                    </article>
                      )
                    })}
                    {milestone.skills.length === 0 && <p className="skill-list__empty">No skills added to this milestone yet.</p>}
                  </div>
                  {isEditingRoadmap && <button className="roadmap-add-skill" type="button" onClick={() => openForm('skill', null, milestone.id)}><Plus size={14} /> Add Skill</button>}
                  {milestoneIndex < roadmap.milestones.length - 1 && <div className="milestone-card__connector" aria-hidden="true"><ArrowDown size={15} /></div>}
                </div>
              </li>
            )
          })}
        </ol>
      )}
      {form && <RoadmapForm key={`${form.kind}-${form.item?.id || 'new'}-${form.parentId || ''}`} kind={form.kind} item={form.item} initialPosition={form.kind === 'milestone' ? roadmap.milestones.length + 1 : form.kind === 'skill' ? (roadmap.milestones.find((milestone) => milestone.id === form.parentId)?.skills.length || 0) + 1 : 1} onCancel={() => setForm(null)} onSubmit={submitForm} />}
    </section>
  )
}

export default RoadmapBuilder
