import { useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { logout } from '../../store/slices/authSlice';
import { formatRole } from '../../utils/format';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/visits': 'Visits',
  '/audit-items': 'Audit Items',
  '/users': 'Users',
  '/regions': 'Regions',
  '/stores': 'Stores',
  '/products': 'Products',
  '/product-stores': 'Inventory',
  '/reports': 'Reports',
};

export default function Header() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAppSelector((s) => s.auth.user);

  const pageTitle =
    PAGE_TITLES[location.pathname] ||
    (location.pathname.startsWith('/visits/') ? 'Visit Detail' : 'Inventory');

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="header-left">
        <h2 className="header-title">{pageTitle}</h2>
      </div>

      <div className="header-search">
        <span className="header-search-icon">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <input className="header-search-input" placeholder="Search stores, products, visits…" readOnly />
      </div>

      <div className="header-right">
        <button className="header-icon-btn" title="Messages">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6" />
          </svg>
        </button>
        <button className="header-icon-btn" title="Notifications">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 01-3.46 0" />
          </svg>
        </button>

        {user && (
          <div className="user-menu">
            <div className="user-info">
              <div className="user-details">
                <span className="user-name">{user.full_name}</span>
                <span className="user-role">{formatRole(user.role)}</span>
              </div>
              <div className="user-avatar">
                {user.full_name.charAt(0).toUpperCase()}
              </div>
            </div>
            <button className="logout-btn" onClick={handleLogout} title="Logout">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4 M16 17l5-5-5-5 M21 12H9" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
