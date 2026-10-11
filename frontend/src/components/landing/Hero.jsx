import { ArrowRight, Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import SkilloraLogo from '../brand/SkilloraLogo.jsx'

export function Hero() {
  return (
    <section className="hero-section" id="top">
      <div className="hero-section__inner page-wrap">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow__mark" /> A clearer path to what’s next</p>
          <h1>Build skills.<br /><span>Turn goals into progress.</span></h1>
          <p className="hero-copy__summary">
            SkillOra turns your long-term goals into structured roadmaps, weekly plans, actionable tasks, and measurable progress.
          </p>
          <p className="hero-copy__tagline">Set. Plan. Act. Track. Grow.</p>
          <div className="hero-copy__actions">
            <Link className="button button--primary" to="/signup">Get Started <ArrowRight size={17} /></Link>
          </div>
          <div className="hero-copy__note"><Check size={15} /> Make steady progress, one week at a time</div>
        </div>

        <div className="hero-brand-presentation">
          <SkilloraLogo variant="full" orientation="vertical" size="xl" withTagline tagline="Set. Plan. Act. Track. Grow." />
          <p>Organized by <strong>GNANEX</strong></p>
        </div>
      </div>
      <div className="hero-section__bottom page-wrap">
        <span>A personal progress system</span><span>From ambition to everyday action</span>
      </div>
    </section>
  )
}

export default Hero
