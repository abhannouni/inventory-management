import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../../hooks/useAppDispatch';
import { useCountUp } from '../../hooks/useCountUp';
import { useVisitTimer } from '../../hooks/useVisitTimer';
import { formatDuration } from '../../utils/format';
import type { Visit } from '../../types';

function useUser() {
  return useAppSelector((s) => s.auth.user);
}

const DATE_LOCALES: Record<string, string> = { fr: 'fr-FR', en: 'en-US', ar: 'ar-MA' };

/* ── Greeting header, shared across every role ── */
export function GreetingHeader({ subtitle }: { subtitle?: string }) {
  const { t, i18n } = useTranslation('dashboard');
  const user = useUser();
  const firstName = user?.full_name?.split(' ')[0] || 'User';
  const today = new Date().toLocaleDateString(DATE_LOCALES[i18n.language] || 'fr-FR', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <motion.div
      style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="db-greeting-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      </div>
      <div>
        <h1 style={{ fontSize: 23, fontWeight: 800, color: 'var(--gray-900)', letterSpacing: '-0.5px' }}>
          {t('greeting', { name: firstName })}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
          <span className="db-date-pill">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {today}
          </span>
          {subtitle && (
            <span style={{ fontSize: 12.5, color: 'var(--gray-400)' }}>{subtitle}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Hero stat card (count-up, icon, tone) ── */
export function StatCard({
  label,
  value,
  dark,
  icon,
  delay,
  change,
  tone,
}: {
  label: string;
  value: number;
  dark?: boolean;
  icon: React.ReactNode;
  delay: number;
  change?: string;
  tone?: 'teal' | 'violet' | 'amber' | 'rose';
}) {
  const displayed = useCountUp(value);
  return (
    <motion.div
      className={`stat-card-v2 ${dark ? 'dark' : 'light'}`}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
    >
      <div className={`sc-icon ${tone ? `tone-${tone}` : ''}`}>{icon}</div>
      <div className="sc-label">{label}</div>
      <div className="sc-value">{displayed}</div>
      {change && <div className="sc-change">{change}</div>}
    </motion.div>
  );
}

/* ── Time Tracker ──
 * Mirrors the real visit clock (same `useVisitTimer` hook as ActiveVisitBar):
 * elapsed time is derived from the server's `checkin_at`, never counted
 * client-side, so it can never drift from what checkout will actually store.
 */
export function TimeTracker({ visit }: { visit: Visit | null }) {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();
  const elapsed = useVisitTimer(visit);
  const running = visit?.status === 'open';

  return (
    <div className="time-tracker-card">
      <div className="tt-title">{t('timeTracker.title')}</div>
      <div className="tt-label" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        {running && <span className="live-pulse-dot" />}
        {running ? (visit?.store?.name ?? t('timeTracker.activeVisit')) : t('timeTracker.noActiveVisit')}
      </div>
      <motion.div
        className="tt-time"
        key={Math.floor(elapsed / 60)}
        initial={{ opacity: 0.7 }}
        animate={{ opacity: 1 }}
      >
        {formatDuration(elapsed)}
      </motion.div>
      {running && (
        <div className="tt-controls">
          <button className="tt-btn tt-btn-stop" onClick={() => navigate('/visits')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>
            {t('timeTracker.checkout')}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Section title ── */
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="dashv2-section-title">{children}</div>;
}

/* ── Card shell used by every non-chart widget (lists, quick actions) ── */
export function DashCard({
  title,
  subtitle,
  action,
  children,
  delay = 0,
}: {
  title: string;
  subtitle?: string;
  action?: { label: string; onClick: () => void };
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      className="dashv2-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
    >
      <div className="dashv2-card-head">
        <div>
          <div className="dashv2-card-title">{title}</div>
          {subtitle && <div className="dashv2-card-sub">{subtitle}</div>}
        </div>
        {action && (
          <button className="dashv2-card-link" onClick={action.onClick}>
            {action.label}
          </button>
        )}
      </div>
      {children}
    </motion.div>
  );
}
