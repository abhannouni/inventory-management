import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { logout } from '../../store/slices/authSlice';
import { useLanguage } from '../../hooks/useLanguage';
import LanguageSwitcher from '../ui/LanguageSwitcher';

export default function Header() {
  const { t } = useTranslation('header');
  const { t: tCommon } = useTranslation('common');
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const { current, languages, setLanguage } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [menuOpen]);

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
        <input className="header-search-input" placeholder={t('searchPlaceholder')} readOnly />
        <span className="header-search-kbd">⌘ F</span>
      </div>

      {/* Push icons to the right */}
      <div className="header-spacer" />

      {/* Right side — icons + user */}
      <div className="header-right">
        {/* Language switcher — quick access */}
        <LanguageSwitcher />

        {/* Mail */}
        <button className="header-icon-btn" title={t('messages')}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </button>

        {/* Bell */}
        <button className="header-icon-btn" title={t('notifications')}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 01-3.46 0" />
          </svg>
        </button>

        {/* User chip — opens account/settings dropdown */}
        {user && (
          <div className="user-menu-wrap" ref={menuRef}>
            <div className="user-menu" onClick={() => setMenuOpen((o) => !o)}>
              <div className="user-avatar">
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="user-details">
                <span className="user-name">{user.full_name}</span>
                <span className="user-role">{user.email}</span>
              </div>
            </div>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  className="user-menu-dropdown"
                  initial={{ opacity: 0, scale: 0.96, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -6 }}
                  transition={{ duration: 0.14 }}
                >
                  <div className="user-menu-dropdown-section-label">{tCommon('language.label')}</div>
                  <div className="user-menu-language-pills">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        className={`language-pill${lang.code === current ? ' active' : ''}`}
                        onClick={() => setLanguage(lang.code)}
                      >
                        {lang.nativeName}
                      </button>
                    ))}
                  </div>
                  <div className="user-menu-dropdown-divider" />
                  <button className="user-menu-dropdown-item" onClick={handleLogout}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    {t('logout')}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </header>
  );
}
