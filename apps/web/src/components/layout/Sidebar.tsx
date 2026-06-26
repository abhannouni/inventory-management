import type { ReactElement } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { usePermissions } from '../../hooks/usePermissions';

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

  const menuItems: NavItem[] = [
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: <Icon d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" d2="M9 22V12h6v10" />,
      show: true,
    },
    {
      to: '/visits',
      label: 'Visits',
      icon: <Icon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />,
      show: !p.isAdmin,
    },
    {
      to: '/schedule',
      label: 'Schedule',
      icon: <Icon d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
      show: true,
    },
    {
      to: '/audit-items',
      label: 'Audit Items',
      icon: <Icon d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
      show: true,
    },
  ];

  const managementItems: NavItem[] = [
    {
      to: '/users',
      label: 'Users',
      icon: <Icon d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />,
      show: p.canManageUsers,
    },
    {
      to: '/regions',
      label: 'Regions',
      icon: <Icon d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />,
      show: p.canManageRegions,
    },
    {
      to: '/stores',
      label: 'Stores',
      icon: <Icon d="M3 9h18v10a2 2 0 01-2 2H5a2 2 0 01-2-2V9zM3 9l2.45-4.9A2 2 0 017.24 3h9.52a2 2 0 011.8 1.1L21 9M12 3v6" />,
      show: p.canManageStores,
    },
    {
      to: '/products',
      label: 'Products',
      icon: <Icon d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />,
      show: p.canManageProducts,
    },
    {
      to: '/product-stores',
      label: 'Inventory',
      icon: <Icon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 14l2 2 4-4" />,
      show: p.canManageProductStores,
    },
  ];

  const generalItems: NavItem[] = [
    {
      to: '/reports',
      label: 'Reports',
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
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
              fill="rgba(255,255,255,0.15)"
              stroke="white"
              strokeWidth="1.6"
            />
            <circle cx="12" cy="9" r="3.5" fill="rgba(255,255,255,0.32)" />
            <path
              d="M9.5,9 L11.3,11.2 L14.8,6.8"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <span className="brand-name">Inventory</span>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <SectionLabel label="Menu" />
        {renderItems(menuItems)}

        {managementItems.some((i) => i.show) && (
          <>
            <SectionLabel label="Management" />
            {renderItems(managementItems)}
          </>
        )}

        <SectionLabel label="General" />
        {renderItems(generalItems)}
      </nav>

      {/* Bottom: logout-style item */}
      <div className="sidebar-footer">
        <div className="sidebar-divider" />
        <NavLink to="/login" className="nav-item nav-item-logout">
          <NavIcon>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </NavIcon>
          <span className="nav-label">Logout</span>
        </NavLink>
      </div>
    </motion.aside>
  );
}
