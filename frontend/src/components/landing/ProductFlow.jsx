import { ArrowDown, ArrowRight, Compass, Flag, LineChart, ListChecks, RotateCcw, Sparkles } from 'lucide-react'

const flow = [
  { label: 'Long-term goals', icon: Flag },
  { label: 'Skills', icon: Sparkles },
  { label: 'Roadmaps', icon: Compass },
  { label: 'Weekly plans', icon: RotateCcw },
  { label: 'Daily execution', icon: ListChecks },
  { label: 'Progress & review', icon: LineChart },
]

export function ProductFlow() {
  return (
    <section className="product-flow-section" id="how-it-works">
      <div className="page-wrap product-flow-section__inner">
        <div className="product-flow-copy">
          <p className="eyebrow eyebrow--light">More than a list of tasks</p>
          <h2>SkillOra connects<br />today to <span>what matters.</span></h2>
          <p>A to-do list helps you remember. A personal progress system helps you understand why the work matters, what comes next, and how your effort is adding up.</p>
          <div className="product-flow-copy__note"><span className="product-flow-copy__line" /> One system. A longer view.</div>
        </div>
        <div className="product-flow" aria-label="Goals connect through skills, roadmaps, plans and daily action to progress and growth">
          {flow.map(({ label, icon: Icon }, index) => (
            <div className="product-flow__item" key={label}>
              <span className="product-flow__icon"><Icon size={17} /></span>
              <span>{label}</span>
              {index < flow.length - 1 && <span className="product-flow__connector"><ArrowDown size={13} /></span>}
            </div>
          ))}
          <div className="product-flow__growth"><span>Growth</span><ArrowRight size={16} /></div>
        </div>
      </div>
    </section>
  )
}

export default ProductFlow
