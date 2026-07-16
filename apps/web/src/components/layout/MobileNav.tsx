import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '../../hooks/usePermissions';
import { NAV_PAGES, hasPageAccess, type NavIcon } from '../../config/navigation';
import Modal from '../ui/Modal';

function IconGlyph({ d, d2 }: NavIcon) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
      {d2 && <path d={d2} />}
    </svg>
  );
}

/**
 * Same source of truth as the desktop Sidebar (`NAV_PAGES`): whatever a user
 * is permitted to see appears here too, split into the bottom bar
 * (`mobilePrimary`) and the "More" sheet. A page can't be visible on desktop
 * and hidden on mobile (or vice versa) by accident, because both read the
 * same permission list off the same config entry.
 */
export default function MobileNav() {
  const { permissions: granted } = usePermissions();
  const { t } = useTranslation('sidebar');
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();

  const visible = NAV_PAGES.filter((page) => page.nav && hasPageAccess(granted, page.permissions));
  const primaryItems = visible.filter((page) => page.nav!.mobilePrimary);
  const moreItems = visible.filter((page) => !page.nav!.mobilePrimary);

  const isMoreActive = moreItems.some((page) => location.pathname.startsWith(page.path));

  return (
    <>
      <nav className="mobile-nav">
        {primaryItems.map((page) => (
          <NavLink
            key={page.id}
            to={page.path}
            className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}
          >
            <span className="mobile-nav-icon">
              <IconGlyph {...page.nav!.icon} />
            </span>
            <span className="mobile-nav-label">{t(page.nav!.labelKey)}</span>
          </NavLink>
        ))}

        {moreItems.length > 0 && (
          <button
            type="button"
            className={`mobile-nav-item${isMoreActive ? ' active' : ''}`}
            onClick={() => setMoreOpen(true)}
          >
            <span className="mobile-nav-icon">
              <IconGlyph d="M12 6a1 1 0 100-2 1 1 0 000 2zM12 13a1 1 0 100-2 1 1 0 000 2zM12 20a1 1 0 100-2 1 1 0 000 2z" />
            </span>
            <span className="mobile-nav-label">{t('nav.more')}</span>
          </button>
        )}
      </nav>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title={t('nav.more')} size="sm">
        <div className="mobile-more-list">
          {moreItems.map((page) => (
            <NavLink
              key={page.id}
              to={page.path}
              className="mobile-more-item"
              onClick={() => setMoreOpen(false)}
            >
              <span className="mobile-nav-icon">
                <IconGlyph {...page.nav!.icon} />
              </span>
              <span>{t(page.nav!.labelKey)}</span>
            </NavLink>
          ))}
        </div>
      </Modal>
    </>
  );
}
