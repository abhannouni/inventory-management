import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '../hooks/useAppDispatch';
import { login, fetchMe } from '../store/slices/authSlice';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, token } = useAppSelector((s) => s.auth);

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (token) {
      dispatch(fetchMe()).then((res) => {
        if (fetchMe.fulfilled.match(res)) navigate('/dashboard');
      });
    }
  }, [token, dispatch, navigate]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email address';
    if (!form.password) errs.password = 'Password is required';
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});

    const res = await dispatch(login(form));
    if (login.fulfilled.match(res)) {
      const meRes = await dispatch(fetchMe());
      if (fetchMe.fulfilled.match(meRes)) {
        toast.success(`Welcome back, ${meRes.payload.full_name}!`);
        navigate('/dashboard');
      }
    } else {
      toast.error(res.payload as string || 'Login failed');
    }
  };

  return (
    <div className="auth-page">
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
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
          <span className="auth-logo-text">Inventory</span>
        </div>

        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to your account to continue</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <Input
            label="Email address"
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
          <Input
            label="Password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            error={errors.password}
            placeholder="••••••••"
            autoComplete="current-password"
            leftIcon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            }
          />

          <div style={{ marginTop: '8px' }}>
            <Button type="submit" loading={loading} style={{ width: '100%' }}>
              Sign in
            </Button>
          </div>
        </form>

        <div className="auth-footer">
          <p>Default credentials: <strong>superadmin@example.com</strong> / <strong>password123</strong></p>
        </div>
      </motion.div>
    </div>
  );
}
