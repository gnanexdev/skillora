import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export function FinalCTA() {
  return (
    <section className="final-cta-section">
      <div className="final-cta page-wrap">
        <div className="final-cta__mark" aria-hidden="true"><span /><span /><span /></div>
        <p className="eyebrow">Make the next move count</p>
        <h2>Your goals deserve a system.</h2>
        <p>Turn your ambition into a plan.<br />Turn your plan into action.<br />Turn your action into measurable progress.</p>
        <Link className="button button--primary" to="/signup">Get Started <ArrowRight size={17} /></Link>
      </div>
    </section>
  )
}

export default FinalCTA
