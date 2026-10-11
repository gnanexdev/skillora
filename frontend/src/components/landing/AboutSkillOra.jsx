import { ArrowRight, CalendarDays, Compass, Flag, ListChecks, LineChart, Sparkles } from 'lucide-react'

const progressPath = [
  { label: 'Long-term goals', icon: Flag },
  { label: 'Roadmaps', icon: Compass },
  { label: 'Milestones & skills', icon: Sparkles },
  { label: 'Weekly plans', icon: CalendarDays },
  { label: 'Tasks & execution', icon: ListChecks },
  { label: 'Measurable progress', icon: LineChart },
]

export function AboutSkillOra() {
  return (
    <section className="about-skillora section" id="about-skillora">
      <div className="page-wrap about-skillora__inner">
        <div className="about-skillora__copy">
          <p className="eyebrow">About SkillOra</p>
          <h2>A clearer way to turn<br />ambition into progress.</h2>
          <p>SkillOra helps you organize goals, map the skills and milestones ahead, and plan a realistic week around the capacity you have.</p>
        </div>
        <div className="about-skillora__path" aria-label="Long-term goals connect through skills, roadmaps, weekly plans and daily execution to measurable progress">
          {progressPath.map(({ label, icon: Icon }, index) => (
            <div className="about-skillora__step" key={label}>
              <span className="about-skillora__step-icon"><Icon size={16} strokeWidth={1.8} /></span>
              <span>{label}</span>
              {index < progressPath.length - 1 && <ArrowRight className="about-skillora__arrow" size={15} aria-hidden="true" />}
            </div>
          ))}
          <span className="about-skillora__outcome">A steady path to growth</span>
        </div>
      </div>
    </section>
  )
}

export default AboutSkillOra
