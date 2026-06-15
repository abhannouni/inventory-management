import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { logout } from '../../store/slices/authSlice';

export default function Header() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <header className="header">

      {/* Search — left side */}
      <div className="header-search">
        <span className="header-search-icon">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <input className="header-search-input" placeholder="Search task" readOnly />
        <span className="header-search-kbd">⌘ F</span>
      </div>

      {/* Push icons to the right */}
      <div className="header-spacer" />

      {/* Right side — icons + user */}
      <div className="header-right">
        {/* Mail */}
        <button className="header-icon-btn" title="Messages">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </button>

        {/* Bell */}
        <button className="header-icon-btn" title="Notifications">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 01-3.46 0" />
          </svg>
        </button>

        {/* User chip */}
        {user && (
          <div className="user-menu" onClick={handleLogout} title="Logout">
            <div className="user-avatar">
              {user.full_name.charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <span className="user-name">{user.full_name}</span>
              <span className="user-role">{user.email}</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
