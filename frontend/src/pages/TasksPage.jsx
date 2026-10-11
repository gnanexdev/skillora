import { useEffect, useState } from 'react'
import { CheckSquare, Plus } from 'lucide-react'
import ProductHeader from '../components/layout/ProductHeader.jsx'
import TaskCard from '../components/planning/TaskCard.jsx'
import TaskForm from '../components/planning/TaskForm.jsx'
import goalsApi from '../services/goalsApi.js'
import tasksApi from '../services/tasksApi.js'

const statusFilters = [['all', 'All'], ['pending', 'Pending'], ['in_progress', 'In Progress'], ['completed', 'Completed'], ['skipped', 'Skipped']]
const priorityFilters = [['all', 'All priorities'], ['low', 'Low'], ['medium', 'Medium'], ['high', 'High']]

export function TasksPage() {
  const [tasks, setTasks] = useState([])
  const [goals, setGoals] = useState([])
  const [status, setStatus] = useState('all')
  const [priority, setPriority] = useState('all')
  const [goalId, setGoalId] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    goalsApi.list()
      .then(({ goals: availableGoals }) => { if (active) setGoals(availableGoals) })
      .catch((loadError) => { if (active) setError(loadError.message || 'Unable to load goals.') })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    const filters = { status, priority, goal_id: goalId }
    tasksApi.list(filters)
      .then(({ tasks: loadedTasks }) => { if (active) setTasks(loadedTasks) })
      .catch((loadError) => { if (active) setError(loadError.message || 'Unable to load tasks.') })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [status, priority, goalId, reloadKey])

  const handleCreate = async (values) => {
    const { task } = await tasksApi.create(values)
    setTasks((current) => [task, ...current])
    setCreating(false)
    setNotice('Task created.')
  }

  const changeFilter = (setter, value) => {
    setError('')
    setIsLoading(true)
    setter(value)
  }

  const handleUpdate = async (task, values) => {
    const { task: updated } = await tasksApi.update(task.id, values)
    const remainsVisible = (status === 'all' || updated.status === status)
      && (priority === 'all' || updated.priority === priority)
      && (goalId === 'all' || updated.goal_id === goalId)
    setTasks((current) => remainsVisible
      ? current.map((item) => item.id === updated.id ? updated : item)
      : current.filter((item) => item.id !== updated.id))
    setNotice(updated.status === 'completed' ? 'Task completed.' : 'Task updated.')
  }

  const handleEdit = async (task, values) => {
    const { task: updated } = await tasksApi.update(task.id, values)
    setTasks((current) => current.map((item) => item.id === updated.id ? updated : item))
    setEditing(null)
    setNotice('Task updated.')
  }

  const handleDelete = async (task) => {
    if (!window.confirm(`Delete “${task.title}”? This cannot be undone.`)) return
    try {
      await tasksApi.remove(task.id)
      setTasks((current) => current.filter((item) => item.id !== task.id))
      setNotice('Task deleted.')
    } catch (deleteError) {
      setError(deleteError.message || 'Unable to delete this task.')
    }
  }

  return (
    <main className="product-page planning-page">
      <ProductHeader />
      <section className="product-content page-wrap">
        <header className="planning-heading">
          <div><p className="eyebrow">Execution in motion</p><h1>Tasks</h1><p>Review the work completed and the next actions still in motion.</p></div>
          <button className="button button--primary" type="button" onClick={() => setCreating(true)}><Plus size={16} /> Add Task</button>
        </header>
        {notice && <p className="planning-notice" role="status">{notice}</p>}
        <div className="task-filters" aria-label="Task filters">
          <div className="task-status-filter" role="group" aria-label="Filter by status">
            {statusFilters.map(([value, label]) => <button type="button" key={value} className={status === value ? 'is-selected' : ''} aria-pressed={status === value} onClick={() => changeFilter(setStatus, value)}>{label}</button>)}
          </div>
          <label>Priority<select value={priority} onChange={(event) => changeFilter(setPriority, event.target.value)}>{priorityFilters.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label>Goal<select value={goalId} onChange={(event) => changeFilter(setGoalId, event.target.value)}><option value="all">All goals</option>{goals.map((goal) => <option value={goal.id} key={goal.id}>{goal.title}</option>)}</select></label>
        </div>
        {isLoading && <div className="goals-state" role="status"><span className="auth-loading__spinner" /> Loading tasks...</div>}
        {!isLoading && error && <div className="goals-error" role="alert"><p>{error}</p><button className="button button--quiet" type="button" onClick={() => { setIsLoading(true); setError(''); setReloadKey((value) => value + 1) }}>Try again</button></div>}
        {!isLoading && !error && tasks.length === 0 && <div className="planning-empty"><span className="goals-empty__icon"><CheckSquare size={20} /></span><h2>No tasks found</h2><p>{status === 'all' ? 'Add a task to give your next step a place in the plan.' : 'There are no tasks matching these filters.'}</p><button className="button button--primary" type="button" onClick={() => setCreating(true)}><Plus size={16} /> Add Task</button></div>}
        {!isLoading && !error && tasks.length > 0 && <div className="task-list task-list--page">{tasks.map((task) => <TaskCard key={task.id} task={task} onUpdate={handleUpdate} onEdit={setEditing} onDelete={handleDelete} />)}</div>}
      </section>
      <footer className="dashboard-footer">Set. Plan. Act. Track. Grow. <span>Organized by GNANEX</span></footer>
      {creating && <TaskForm onCancel={() => setCreating(false)} onSubmit={handleCreate} />}
      {editing && <TaskForm task={editing} onCancel={() => setEditing(null)} onSubmit={(values) => handleEdit(editing, values)} />}
    </main>
  )
}

export default TasksPage
