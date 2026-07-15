import type { ReactElement } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '../../hooks/usePermissions';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { logout } from '../../store/slices/authSlice';
import Logo from '../ui/Logo';

interface NavItem {
  to: string;
  label: string;
  icon: ReactElement;
  badge?: string;
  show: boolean;
}

function NavIcon({ children }: { children: ReactElement }) {
  return <span className="nav-icon">{children}</span>;
}

function SectionLabel({ label }: { label: string }) {
  return <span className="sidebar-section-label">{label}</span>;
}

/* Inline SVG helpers */
const Icon = ({ d, d2 }: { d: string; d2?: string }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
    {d2 && <path d={d2} />}
  </svg>
);

export default function Sidebar() {
  const p = usePermissions();
  const { t } = useTranslation('sidebar');
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const menuItems: NavItem[] = [
    {
      to: '/dashboard',
      label: t('nav.dashboard'),
      icon: <Icon d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" d2="M9 22V12h6v10" />,
      show: true,
    },
    {
      to: '/visits',
      label: t('nav.visits'),
      icon: <Icon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />,
      show: !p.isAdmin,
    },
    {
      to: '/pos',
      label: t('nav.posMap'),
      icon: <Icon d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />,
      show: true,
    },
    {
      to: '/schedule',
      label: t('nav.schedule'),
      icon: <Icon d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
      show: true,
    },
    {
      to: '/audit-items',
      label: t('nav.auditItems'),
      icon: <Icon d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
      show: true,
    },
  ];

  const administrationItems: NavItem[] = [
    {
      to: '/users',
      label: t('nav.users'),
      icon: <Icon d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />,
      show: p.canManageUsers,
    },
    {
      to: '/roles',
      label: t('nav.roles'),
      icon: <Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" d2="M9 12l2 2 4-4" />,
      show: p.can('roles.read'),
    },
  ];

  const managementItems: NavItem[] = [
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
  ];

  const generalItems: NavItem[] = [
    {
      to: '/reports',
      label: t('nav.reports'),
      icon: <Icon d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
      show: true,
    },
  ];

  const renderItems = (items: NavItem[]) =>
    items
      .filter((i) => i.show)
      .map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <NavIcon>{item.icon}</NavIcon>
          <span className="nav-label">{item.label}</span>
          {item.badge && <span className="nav-badge">{item.badge}</span>}
        </NavLink>
      ));

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
        <SectionLabel label={t('sections.menu')} />
        {renderItems(menuItems)}

        {administrationItems.some((i) => i.show) && (
          <>
            <SectionLabel label={t('sections.administration')} />
            {renderItems(administrationItems)}
          </>
        )}

        {managementItems.some((i) => i.show) && (
          <>
            <SectionLabel label={t('sections.management')} />
            {renderItems(managementItems)}
          </>
        )}

        <SectionLabel label={t('sections.general')} />
        {renderItems(generalItems)}
      </nav>

      {/* Bottom: logout-style item */}
      <div className="sidebar-footer">
        <div className="sidebar-divider" />
        <button type="button" className="nav-item nav-item-logout" onClick={handleLogout}>
          <NavIcon>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </NavIcon>
          <span className="nav-label">{t('logout')}</span>
        </button>
      </div>
    </motion.aside>
  );
}
