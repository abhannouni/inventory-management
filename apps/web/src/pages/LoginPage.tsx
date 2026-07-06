import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../hooks/useAppDispatch';
import { login, fetchMe } from '../store/slices/authSlice';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import LanguageSwitcher from '../components/ui/LanguageSwitcher';
import Logo from '../components/ui/Logo';
import loginHero from '../assets/login-hero.png';

const FEATURE_KEYS = ['visits', 'inventory', 'reports'] as const;

const FEATURE_ICONS: Record<(typeof FEATURE_KEYS)[number], React.ReactNode> = {
  visits: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  inventory: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  reports: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
};

export default function LoginPage() {
  const { t } = useTranslation('login');
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, token } = useAppSelector((s) => s.auth);

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setForm((f) => ({ ...f, email: rememberedEmail }));
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    if (token) {
      dispatch(fetchMe()).then((res) => {
        if (fetchMe.fulfilled.match(res)) navigate('/dashboard');
      });
    }
  }, [token, dispatch, navigate]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.email) errs.email = t('errors.emailRequired');
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = t('errors.emailInvalid');
    if (!form.password) errs.password = t('errors.passwordRequired');
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});

    const res = await dispatch(login(form));
    if (login.fulfilled.match(res)) {
      if (rememberMe) localStorage.setItem('rememberedEmail', form.email);
      else localStorage.removeItem('rememberedEmail');
      const meRes = await dispatch(fetchMe());
      if (fetchMe.fulfilled.match(meRes)) {
        toast.success(t('welcomeToast', { name: meRes.payload.full_name }));
        navigate('/dashboard');
      }
    } else {
      toast.error((res.payload as string) || t('loginFailed'));
    }
  };

  return (
    <div className="auth-page">
      {/* ── Left visual panel ── */}
      <div className="auth-visual">
        <div className="auth-visual-grid" />
        <div className="auth-visual-glow-a" />
        <div className="auth-visual-glow-b" />
        <img className="auth-visual-image" src={loginHero} alt="" aria-hidden />

        <motion.div
          className="auth-visual-top"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="auth-visual-brand">
            <div className="auth-visual-brand-icon">
              <Logo size={20} />
            </div>
            <span className="auth-visual-brand-name">Inventory</span>
          </div>
        </motion.div>

        <motion.div
          className="auth-visual-bottom"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <h2 className="auth-visual-heading">{t('visualHeading')}</h2>
          <p className="auth-visual-sub">{t('visualSubtitle')}</p>
          <div className="auth-feature-list">
            {FEATURE_KEYS.map((key, i) => (
              <motion.div
                key={key}
                className="auth-feature-item"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.08, duration: 0.4 }}
              >
                <span className="auth-feature-icon">{FEATURE_ICONS[key]}</span>
                {t(`features.${key}`)}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Right form panel ── */}
      <div className="auth-form-panel">
        <div className="auth-lang-switcher">
          <LanguageSwitcher />
        </div>

        <motion.div
          className="auth-card"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <div className="auth-logo">
            <div className="auth-logo-icon">
              <Logo size={26} />
            </div>
            <span className="auth-logo-text">Inventory</span>
          </div>

          <h1 className="auth-title">{t('title')}</h1>
          <p className="auth-subtitle">{t('subtitle')}</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <Input
              label={t('emailLabel')}
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              error={errors.email}
              placeholder="you@example.com"
              autoComplete="email"
              leftIcon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              }
            />
            <div className="form-group">
              <label htmlFor="login-password" className="form-label">{t('passwordLabel')}</label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                </span>
                <input
                  id="login-password"
                  className={`form-input has-icon has-action ${errors.password ? 'is-error' : ''}`}
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="input-action-btn"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.94 10.94 0 0112 20c-7 0-11-8-11-8a18.5 18.5 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && <p className="form-error">{errors.password}</p>}
            </div>

            <label className="auth-remember">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              {t('rememberMe')}
            </label>

            <div style={{ marginTop: '8px' }}>
              <Button type="submit" loading={loading} style={{ width: '100%' }}>
                {t('signIn')}
              </Button>
            </div>
          </form>

          <div className="auth-footer">
            <p>{t('defaultCredentials')} <strong>superadmin@example.com</strong> / <strong>password123</strong></p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
