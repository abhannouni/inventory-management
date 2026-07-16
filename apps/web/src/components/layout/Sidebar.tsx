import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '../../hooks/usePermissions';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { logout } from '../../store/slices/authSlice';
import { NAV_PAGES, hasPageAccess, type NavIcon, type NavSection } from '../../config/navigation';
import Logo from '../ui/Logo';

function IconGlyph({ d, d2 }: NavIcon) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
      {d2 && <path d={d2} />}
    </svg>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <span className="sidebar-section-label">{label}</span>;
}

const SECTIONS: NavSection[] = ['menu', 'administration', 'management', 'general'];

/**
 * Every link here comes from `NAV_PAGES` — the same list that generates the
 * routes in `App.tsx` and the mobile nav. A page appears if, and only if, the
 * signed-in user holds one of its required permissions: no role names, no
 * per-item booleans to keep in sync by hand.
 */
export default function Sidebar() {
  const { permissions: granted } = usePermissions();
  const { t } = useTranslation('sidebar');
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const visibleBySection = (section: NavSection) =>
    NAV_PAGES.filter((page) => page.nav?.section === section && hasPageAccess(granted, page.permissions));

  return (
    <motion.aside
      className="sidebar"
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="brand-icon">
          <Logo size={22} />
        </div>
        <span className="brand-name">{t('brand')}</span>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {SECTIONS.map((section) => {
          const items = visibleBySection(section);
          if (items.length === 0) return null;

          return (
            <div key={section}>
              <SectionLabel label={t(`sections.${section}`)} />
              {items.map((page) => (
                <NavLink
                  key={page.id}
                  to={page.path}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <span className="nav-icon">
                    <IconGlyph {...page.nav!.icon} />
                  </span>
                  <span className="nav-label">{t(page.nav!.labelKey)}</span>
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      {/* Bottom: logout-style item */}
      <div className="sidebar-footer">
        <div className="sidebar-divider" />
        <button type="button" className="nav-item nav-item-logout" onClick={handleLogout}>
          <span className="nav-icon">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </span>
          <span className="nav-label">{t('logout')}</span>
        </button>
      </div>
    </motion.aside>
  );
}
