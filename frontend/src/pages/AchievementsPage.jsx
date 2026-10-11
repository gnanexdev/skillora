import { useEffect, useState } from 'react'
import { Award, CalendarCheck2, CheckCheck, Flag, Footprints, Gem } from 'lucide-react'
import ProductHeader from '../components/layout/ProductHeader.jsx'
import achievementsApi from '../services/achievementsApi.js'
import '../styles/achievements.css'

const ACHIEVEMENT_ICONS = {
  first_task_completed: Footprints,
  goal_completed: Flag,
  milestone_completed: Gem,
  skill_completed: CheckCheck,
  weekly_consistency: CalendarCheck2,
}

function formatEarnedDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeZone: undefined,
  }).format(new Date(value))
}

export function AchievementsPage() {
  const [achievements, setAchievements] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    achievementsApi.list()
      .then(({ achievements: loaded }) => { if (active) setAchievements(loaded) })
      .catch((loadError) => { if (active) setError(loadError.message || 'Unable to load achievements.') })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [reloadKey])

  const retry = () => {
    setIsLoading(true)
    setError('')
    setReloadKey((value) => value + 1)
  }

  return (
    <main className="product-page achievements-page">
      <ProductHeader />
      <section className="product-content page-wrap achievements-content">
        <header className="product-page-heading achievements-heading">
          <div>
            <p className="eyebrow">Recognizing real progress</p>
            <h1>Achievements</h1>
            <p>Milestones earned from completed tasks and goals.</p>
          </div>
        </header>

        {error && <div className="goals-error" role="alert"><p>{error}</p><button className="button button--quiet" type="button" onClick={retry}>Try again</button></div>}
        {isLoading && <div className="goals-state" role="status"><span className="auth-loading__spinner" /> Loading achievements...</div>}
        {!isLoading && !error && achievements.length === 0 && (
          <div className="planning-empty achievements-empty">
            <span className="goals-empty__icon"><Award size={20} /></span>
            <h2>Your milestones will appear here</h2>
            <p>Complete a task, skill, milestone, or goal to earn a record of your progress.</p>
          </div>
        )}
        {!isLoading && !error && achievements.length > 0 && (
          <div className="achievements-list" aria-label="Earned achievements">
            {achievements.map((achievement) => {
              const Icon = ACHIEVEMENT_ICONS[achievement.type] || Award
              return (
                <article className="achievement-row" key={achievement.id}>
                  <span className="achievement-row__icon"><Icon size={19} aria-hidden="true" /></span>
                  <div className="achievement-row__body">
                    <h2>{achievement.title}</h2>
                    <p>{achievement.description}</p>
                  </div>
                  <time className="achievement-row__date" dateTime={achievement.earned_at}>{formatEarnedDate(achievement.earned_at)}</time>
                </article>
              )
            })}
          </div>
        )}
      </section>
      <footer className="dashboard-footer">SkillOra <span>Progress, recognized</span></footer>
    </main>
  )
}

export default AchievementsPage