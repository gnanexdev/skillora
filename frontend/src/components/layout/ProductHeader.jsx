import { ArrowLeft, BookOpenCheck, CalendarDays, Heart, House, RotateCcw, Target } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import SkilloraLogo from '../brand/SkilloraLogo.jsx'
import ProfileMenu from './ProfileMenu.jsx'

export function ProductHeader({ backTo = '/app', backLabel = 'Dashboard' }) {
  const location = useLocation()
  const activeDestination = location.pathname === '/week' ? '/week'
    : location.pathname === '/goals' || location.pathname.startsWith('/goals/') ? '/goals'
      : location.pathname === '/tasks' ? '/tasks'
        : location.pathname === '/weekly-review' ? '/weekly-review'
          : location.pathname === '/routines' ? '/routines'
            : location.pathname === '/life-context' || location.pathname === '/life-events' ? '/life-context' : '/app'

  return (
    <header className="dashboard-header">
      <Link to="/app" className="dashboard-header__brand" aria-label="SkillOra dashboard">
        <SkilloraLogo variant="full" orientation="horizontal" size="sm" />
      </Link>
      <nav className="product-nav" aria-label="Product navigation">
        <Link to="/app" aria-label="Today" title="Today" aria-current={activeDestination === '/app' ? 'page' : undefined}><House size={16} aria-hidden="true" /> Today</Link>
        <Link to="/routines" aria-label="Rhythm" title="Rhythm" aria-current={activeDestination === '/routines' ? 'page' : undefined}><RotateCcw size={16} aria-hidden="true" /> Rhythm</Link>
        <Link to="/goals" aria-label="Goals" title="Goals" aria-current={activeDestination === '/goals' ? 'page' : undefined}><Target size={16} aria-hidden="true" /> Goals</Link>
        <Link to="/week" aria-label="Plans" title="Plans" aria-current={activeDestination === '/week' ? 'page' : undefined}><CalendarDays size={16} aria-hidden="true" /> Plans</Link>
        <Link to="/weekly-review" aria-label="Weekly Review" title="Weekly Review" aria-current={activeDestination === '/weekly-review' ? 'page' : undefined}><BookOpenCheck size={16} aria-hidden="true" /> Review</Link>
        <Link to="/life-context" aria-label="Life Context" title="Life Context" aria-current={activeDestination === '/life-context' ? 'page' : undefined}><Heart size={16} aria-hidden="true" /> Life Context</Link>
      </nav>
      <div className="product-header__actions">
        {backTo !== '/app' && <Link className="product-header__back" to={backTo}><ArrowLeft size={15} /> {backLabel}</Link>}
        <ProfileMenu />
      </div>
    </header>
  )
}

export default ProductHeader
