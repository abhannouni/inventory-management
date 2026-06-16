import { NavLink } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';

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

  const items: NavItem[] = [
    {
      to: '/dashboard',
      label: 'Home',
      icon: <Icon d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" d2="M9 22V12h6v10" />,
      show: true,
    },
    {
      to: '/visits',
      label: 'Visits',
      icon: <Icon d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z" />,
      show: true,
    },
    /* Merchandiser / Supervisor — field-focused items */
    {
      to: '/audit-items',
      label: 'Audit',
      icon: <Icon d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
      show: !p.canManageUsers,
    },
    /* Admin / Super Admin — management items */
    {
      to: '/stores',
      label: 'Stores',
      icon: <Icon d="M3 9h18v10a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" d2="M3 9l2.45-4.9A2 2 0 017.24 3h9.52a2 2 0 011.8 1.1L21 9" />,
      show: p.canManageStores,
    },
    {
      to: '/users',
      label: 'Users',
      icon: <Icon d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z" d2="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />,
      show: p.canManageUsers,
    },
    {
      to: '/reports',
      label: 'Reports',
      icon: <Icon d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
      show: true,
    },
  ];

  return (
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
    </nav>
  );
}
