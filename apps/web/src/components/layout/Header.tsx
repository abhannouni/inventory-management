import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { logout } from '../../store/slices/authSlice';
import { formatRole } from '../../utils/format';

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
      <div className="header-left">
        <h2 className="header-title">Dashboard</h2>
      </div>
      <div className="header-right">
        {user && (
          <div className="user-menu">
            <div className="user-info">
              <div className="user-avatar">
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="user-details">
                <span className="user-name">{user.full_name}</span>
                <span className="user-role">{formatRole(user.role)}</span>
              </div>
            </div>
            <button className="logout-btn" onClick={handleLogout} title="Logout">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4 M16 17l5-5-5-5 M21 12H9" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
