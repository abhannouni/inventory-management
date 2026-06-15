import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { usePermissions } from '../../hooks/usePermissions';

interface NavItem {
  to: string;
  label: string;
  icon: JSX.Element;
  show: boolean;
}

function NavIcon({ path }: { path: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

export default function Sidebar() {
  const p = usePermissions();

  const navItems: NavItem[] = [
    { to: '/dashboard', label: 'Dashboard', icon: <NavIcon path="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10" />, show: true },
    { to: '/users', label: 'Users', icon: <NavIcon path="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8z M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75" />, show: p.canManageUsers },
    { to: '/regions', label: 'Regions', icon: <NavIcon path="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />, show: p.canManageRegions },
    { to: '/stores', label: 'Stores', icon: <NavIcon path="M3 9h18v10a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M3 9l2.45-4.9A2 2 0 017.24 3h9.52a2 2 0 011.8 1.1L21 9 M12 3v6" />, show: true },
    { to: '/products', label: 'Products', icon: <NavIcon path="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />, show: true },
    { to: '/product-stores', label: 'Product Inventory', icon: <NavIcon path="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2 M9 5a2 2 0 002 2h2a2 2 0 002-2 M9 5a2 2 0 012-2h2a2 2 0 012 2 M9 14l2 2 4-4" />, show: p.canManageProductStores },
    { to: '/visits', label: 'Visits', icon: <NavIcon path="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2 M9 5a2 2 0 002 2h2a2 2 0 002-2 M9 5a2 2 0 012-2h2a2 2 0 012 2 M12 12h.01 M12 16h.01" />, show: true },
    { to: '/audit-items', label: 'Audit Items', icon: <NavIcon path="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />, show: true },
    { to: '/reports', label: 'Reports', icon: <NavIcon path="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />, show: true },
  ];

  return (
    <motion.aside
      className="sidebar"
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="sidebar-brand">
        <div className="brand-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <span className="brand-name">Inventory</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.filter((item) => item.show).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </motion.aside>
  );
}
