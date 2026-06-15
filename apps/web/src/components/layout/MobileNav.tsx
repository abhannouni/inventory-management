import { NavLink, useLocation } from 'react-router-dom';

function Icon({ d, d2 }: { d: string; d2?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
      {d2 && <path d={d2} />}
    </svg>
  );
}

export default function MobileNav() {
  const { pathname } = useLocation();

  /* "Visit" tab is active for both /my-visit and /visits */
  const visitActive = pathname.startsWith('/my-visit') || pathname.startsWith('/visits');

  return (
    <nav className="mobile-nav">

      <NavLink to="/dashboard" className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}>
        <span className="mobile-nav-icon">
          <Icon d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" d2="M9 22V12h6v10" />
        </span>
        <span className="mobile-nav-label">Home</span>
      </NavLink>

      {/* Visit = MerchandiserFlowPage, active on /my-visit OR /visits */}
      <NavLink
        to="/my-visit"
        className={`mobile-nav-item${visitActive ? ' active' : ''}`}
      >
        <span className="mobile-nav-icon">
          <Icon d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z" />
        </span>
        <span className="mobile-nav-label">Visit</span>
      </NavLink>

      <NavLink to="/audit-items" className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}>
        <span className="mobile-nav-icon">
          <Icon d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </span>
        <span className="mobile-nav-label">Audit</span>
      </NavLink>

      <NavLink to="/stores" className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}>
        <span className="mobile-nav-icon">
          <Icon d="M3 9h18v10a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" d2="M3 9l2.45-4.9A2 2 0 017.24 3h9.52a2 2 0 011.8 1.1L21 9" />
        </span>
        <span className="mobile-nav-label">Stores</span>
      </NavLink>

      <NavLink to="/reports" className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}>
        <span className="mobile-nav-icon">
          <Icon d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </span>
        <span className="mobile-nav-label">Reports</span>
      </NavLink>

    </nav>
  );
}
