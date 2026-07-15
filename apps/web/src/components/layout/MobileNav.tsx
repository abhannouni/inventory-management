import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '../../hooks/usePermissions';
import Modal from '../ui/Modal';

function Icon({ d, d2 }: { d: string; d2?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
      {d2 && <path d={d2} />}
    </svg>
  );
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactElement;
  show: boolean;
}

export default function MobileNav() {
  const p = usePermissions();
  const { t } = useTranslation('sidebar');
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();

  const moreItems: NavItem[] = [
    {
      to: '/users',
      label: t('nav.users'),
      icon: <Icon d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />,
      show: p.canManageUsers,
    },
    {
      to: '/regions',
      label: t('nav.regions'),
      icon: <Icon d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />,
      show: p.canManageRegions,
    },
    {
      to: '/stores',
      label: t('nav.storesManage'),
      icon: <Icon d="M3 9h18v10a2 2 0 01-2 2H5a2 2 0 01-2-2V9zM3 9l2.45-4.9A2 2 0 017.24 3h9.52a2 2 0 011.8 1.1L21 9M12 3v6" />,
      show: p.canManageStores,
    },
    {
      to: '/products',
      label: t('nav.products'),
      icon: <Icon d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />,
      show: p.canManageProducts,
    },
    {
      to: '/product-stores',
      label: t('nav.inventory'),
      icon: <Icon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 14l2 2 4-4" />,
      show: p.canManageProductStores,
    },
  ].filter((i) => i.show);

  const isMoreActive = moreItems.some((i) => location.pathname.startsWith(i.to));

  const items: NavItem[] = [
    {
      to: '/dashboard',
      label: t('nav.home'),
      icon: <Icon d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" d2="M9 22V12h6v10" />,
      show: true,
    },
    /* POS map & directory — every role */
    {
      to: '/pos',
      label: t('nav.posMap'),
      icon: <Icon d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />,
      show: true,
    },
    {
      to: '/visits',
      label: t('nav.visits'),
      icon: <Icon d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z" />,
      show: !p.isAdmin,
    },
    /* Calendar — all roles */
    {
      to: '/schedule',
      label: t('nav.schedule'),
      icon: <Icon d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
      show: true,
    },
    /* Supervisor+ — audit items */
    {
      to: '/audit-items',
      label: t('nav.audit'),
      icon: <Icon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 14l2 2 4-4" />,
      show: p.isSupervisor,
    },
    {
      to: '/reports',
      label: t('nav.reports'),
      icon: <Icon d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
      show: true,
    },
  ];

  return (
    <>
      <nav className="mobile-nav">
        {items
          .filter((i) => i.show)
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}
            >
              <span className="mobile-nav-icon">{item.icon}</span>
              <span className="mobile-nav-label">{item.label}</span>
            </NavLink>
          ))}

        {moreItems.length > 0 && (
          <button
            type="button"
            className={`mobile-nav-item${isMoreActive ? ' active' : ''}`}
            onClick={() => setMoreOpen(true)}
          >
            <span className="mobile-nav-icon">
              <Icon d="M12 6a1 1 0 100-2 1 1 0 000 2zM12 13a1 1 0 100-2 1 1 0 000 2zM12 20a1 1 0 100-2 1 1 0 000 2z" />
            </span>
            <span className="mobile-nav-label">{t('nav.more')}</span>
          </button>
        )}
      </nav>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title={t('nav.more')} size="sm">
        <div className="mobile-more-list">
          {moreItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className="mobile-more-item"
              onClick={() => setMoreOpen(false)}
            >
              <span className="mobile-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </Modal>
    </>
  );
}
