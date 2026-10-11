import { useState } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import SkilloraLogo from '../brand/SkilloraLogo.jsx';

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="site-header__brand" to="/" aria-label="SkillOra home" onClick={closeMenu}>
          <SkilloraLogo variant="full" orientation="horizontal" size="sm" />
        </Link>
        <nav className={`site-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
          <a href="/#how-it-works" onClick={closeMenu}>How It Works</a>
          <a href="/#features" onClick={closeMenu}>Features</a>
          <a href="/#about-skillora" onClick={closeMenu}>About</a>
          <Link className="button button--quiet site-nav__signin" to="/signin" onClick={closeMenu}>Sign In</Link>
          <Link className="button button--nav" to="/signup" onClick={closeMenu}>Sign Up <ArrowUpRight size={15} aria-hidden="true" /></Link>
        </nav>
        <div className="site-header__tools">
          <button type="button" className="site-header__menu-toggle" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
