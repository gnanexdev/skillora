import { CalendarDays, CheckSquare, Compass, Flag, LineChart, Timer } from 'lucide-react'

const features = [
  { title: 'Goals', description: 'Keep your effort connected to the changes that matter to you.', icon: Flag, color: 'blue' },
  { title: 'Roadmaps', description: 'See the milestones and skills that shape a clear route forward.', icon: Compass, color: 'cyan' },
  { title: 'Weekly Planning', description: 'Turn long-term intentions into a realistic plan for this week.', icon: CalendarDays, color: 'mint' },
  { title: 'Tasks', description: 'Keep the next meaningful action clear, focused, and connected.', icon: CheckSquare, color: 'blue' },
  { title: 'Capacity Planning', description: 'Plan around the time and energy you actually have available.', icon: Timer, color: 'cyan' },
  { title: 'Progress Tracking', description: 'See completed work and understand how it moves you forward.', icon: LineChart, color: 'mint' },
]

export function Features() {
  return (
    <section className="section features-section" id="features">
      <div className="page-wrap">
        <div className="section-heading section-heading--center">
          <p className="eyebrow">A connected workspace for growth</p>
          <h2>Everything connected<br />to meaningful progress.</h2>
          <p>One connected workspace for setting direction, showing up, and learning as you go.</p>
        </div>
        <div className="features-grid">
          {features.map(({ title, description, icon: Icon, color }) => (
            <article className="feature-item" key={title}>
              <span className={`feature-item__icon feature-item__icon--${color}`}><Icon size={19} strokeWidth={1.8} /></span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Features
