import { Activity, Gauge } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'

const navItems = [
  { label: 'Home', to: '/' },
  { label: 'Analyze', to: '/analyze' },
  { label: 'Results', to: '/results' },
]

function Navbar() {
  return (
    <header className="topbar">
      <div className="brand-wrap">
        <div className="brand-mark">
          <Activity size={18} />
        </div>
        <div>
          <div className="brand-name">Gymnastics AI</div>
          <div className="brand-tag">Movement intelligence</div>
        </div>
      </div>

      <nav className="main-nav" aria-label="Main navigation">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <Link to="/analyze" className="nav-cta">
        <Gauge size={15} />
        Analyze now
      </Link>
    </header>
  )
}

export default Navbar
