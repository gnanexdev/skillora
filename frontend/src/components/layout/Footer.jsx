import { Link } from 'react-router-dom';
import SkilloraLogo from '../brand/SkilloraLogo';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <Link to="/" aria-label="SkillOra home" className="site-footer__brand">
          <SkilloraLogo variant="full" orientation="horizontal" size="sm" />
          <span>Set. Plan. Act. Track. Grow.</span>
        </Link>
        <div className="site-footer__end">
          <span>Organized by GNANEX</span>
          <span className="site-footer__copyright">© {new Date().getFullYear()} SkillOra</span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
