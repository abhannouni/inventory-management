import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../hooks/useAppDispatch';
import { fetchVisits } from '../store/slices/visitsSlice';
import { fetchStores } from '../store/slices/storesSlice';
import { fetchProducts } from '../store/slices/productsSlice';
import { fetchUsers } from '../store/slices/usersSlice';
import Badge from '../components/ui/Badge';
import { formatDate } from '../utils/format';

/* ── Count-up hook ── */
function useCountUp(target: number, duration = 1200) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    let start: number;
    let raf: number;
    const step = (ts: number) => {
      if (!start) start = ts;
      const prog = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - prog, 3);
      setCount(Math.round(ease * target));
      if (prog < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return count;
}

/* ── Stat Card ── */
function StatCard({
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
  tone?: 'teal' | 'violet' | 'amber';
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

/* ── Weekly Bar Chart ── */
const CHART_FILL = ['light', 'primary', 'accent', 'primary', 'light', 'medium', 'light'] as const;

function WeeklyBarChart({ visits }: { visits: { checkin_at: string }[] }) {
  const { t } = useTranslation('dashboard');
  const chartDays = t('weekDaysShort', { returnObjects: true }) as string[];
  const today = new Date().getDay();
  const counts = chartDays.map((_, i) =>
    visits.filter((v) => new Date(v.checkin_at).getDay() === i).length,
  );
  const max = Math.max(...counts, 1);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120, marginTop: 8 }}>
      {counts.map((val, i) => {
        const pct = Math.max((val / max) * 100, 4);
        const isToday = i === today;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ flex: 1, width: '100%', background: 'var(--gray-100)', borderRadius: 6, overflow: 'hidden', display: 'flex', alignItems: 'flex-end' }}>
              <motion.div
                style={{
                  width: '100%',
                  borderRadius: 6,
                  background: isToday
                    ? 'var(--primary)'
                    : CHART_FILL[i] === 'medium'
                    ? 'var(--primary-medium)'
                    : CHART_FILL[i] === 'accent'
                    ? 'var(--accent)'
                    : CHART_FILL[i] === 'light'
                    ? 'repeating-linear-gradient(45deg,var(--gray-200),var(--gray-200) 2px,transparent 2px,transparent 7px)'
                    : 'var(--primary)',
                }}
                initial={{ height: 0 }}
                animate={{ height: `${pct}%` }}
                transition={{ delay: 0.3 + i * 0.07, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
              />
            </div>
            <span style={{ fontSize: 11, color: isToday ? 'var(--primary)' : 'var(--gray-400)', fontWeight: isToday ? 700 : 500 }}>
              {chartDays[i]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Semi-circle progress ── */
function SemiCircle({ percentage }: { percentage: number }) {
  const { t } = useTranslation('dashboard');
  const r = 62;
  const cx = 100;
  const cy = 80;
  const arc = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const total = Math.PI * r;
  const filled = total * (percentage / 100);
  const empty = total - filled;

  return (
    <div className="semi-circle-wrap">
      <svg viewBox="0 0 200 100" width="180" height="105">
        <path d={arc} fill="none" stroke="var(--gray-100)" strokeWidth="14" strokeLinecap="round" />
        <motion.path
          d={arc}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${empty}`}
          initial={{ strokeDasharray: `0 ${total}` }}
          animate={{ strokeDasharray: `${filled} ${empty}` }}
          transition={{ duration: 1.4, ease: 'easeOut', delay: 0.5 }}
        />
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="22" fontWeight="800" fill="var(--gray-900)">
          {percentage}%
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="10" fill="var(--gray-400)">
          {t('auditProgress.completion')}
        </text>
      </svg>
      <div className="semi-circle-legend">
        {[
          { label: t('legend.inStock'), color: 'var(--success)' },
          { label: t('legend.lowStock'), color: 'var(--warning)' },
          { label: t('legend.outOfStock'), color: 'var(--danger)' },
        ].map((leg) => (
          <div key={leg.label} className="legend-item">
            <div className="legend-dot" style={{ background: leg.color }} />
            {leg.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Time Tracker ── */
function TimeTracker({ hasOpenVisit }: { hasOpenVisit: boolean }) {
  const { t } = useTranslation('dashboard');
  const [secs, setSecs] = useState(0);
  const [running, setRunning] = useState(hasOpenVisit);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => setSecs((s) => s + 1), 1000);
    } else if (ref.current) {
      clearInterval(ref.current);
    }
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [running]);

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sc = s % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sc).padStart(2, '0')}`;
  };

  return (
    <div className="time-tracker-card">
      <div className="tt-title">{t('timeTracker.title')}</div>
      <div className="tt-label" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        {running && <span className="live-pulse-dot" />}
        {hasOpenVisit ? t('timeTracker.activeVisit') : t('timeTracker.noActiveVisit')}
      </div>
      <motion.div
        className="tt-time"
        key={Math.floor(secs / 60)}
        initial={{ opacity: 0.7 }}
        animate={{ opacity: 1 }}
      >
        {fmt(secs)}
      </motion.div>
      <div className="tt-controls">
        <button
          className="tt-btn tt-btn-pause"
          onClick={() => setRunning((r) => !r)}
        >
          {running ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
          )}
          {running ? t('timeTracker.pause') : t('timeTracker.resume')}
        </button>
        <button
          className="tt-btn tt-btn-stop"
          onClick={() => { setRunning(false); setSecs(0); }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>
          {t('timeTracker.stop')}
        </button>
      </div>
    </div>
  );
}

/* ── Avatar colors for team ── */
const AVATAR_COLORS = [
  '#1B3A2A', '#2D6A4F', '#0f766e', '#0e7490', '#1d4ed8', '#7c3aed', '#a21caf', '#be123c',
];

/* ── Main Dashboard ── */
const DATE_LOCALES: Record<string, string> = { fr: 'fr-FR', en: 'en-US', ar: 'ar-MA' };

export default function DashboardPage() {
  const { t, i18n } = useTranslation('dashboard');
  const { t: tCommon } = useTranslation('common');
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { items: visits } = useAppSelector((s) => s.visits);
  const { items: stores } = useAppSelector((s) => s.stores);
  const { items: products } = useAppSelector((s) => s.products);
  const { items: users } = useAppSelector((s) => s.users);
  const user = useAppSelector((s) => s.auth.user);

  useEffect(() => {
    dispatch(fetchVisits(undefined));
    dispatch(fetchStores());
    dispatch(fetchProducts());
    if (['super_admin', 'admin'].includes(user?.role || '')) dispatch(fetchUsers());
  }, [dispatch, user]);

  const openVisits = visits.filter((v) => v.status === 'open').length;
  const closedVisits = visits.filter((v) => v.status === 'closed').length;
  const hasOpenVisit = openVisits > 0;

  const auditCompletion = visits.length > 0
    ? Math.round((closedVisits / visits.length) * 100)
    : 0;

  const firstName = user?.full_name?.split(' ')[0] || 'User';
  const today = new Date().toLocaleDateString(DATE_LOCALES[i18n.language] || 'fr-FR', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Greeting */}
      <motion.div
        style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}
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
          <span className="db-date-pill">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {today}
          </span>
        </div>
      </motion.div>

      {/* Stats Row */}
      <div className="db-stats-grid">
        <StatCard
          label={t('stats.totalStores')}
          value={stores.length}
          dark
          delay={0}
          change={t('changes.retailNetwork')}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9h18v10a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M3 9l2.45-4.9A2 2 0 017.24 3h9.52a2 2 0 011.8 1.1L21 9" />
            </svg>
          }
        />
        <StatCard
          label={t('stats.totalProducts')}
          value={products.length}
          delay={0.08}
          change={t('changes.skusTracked')}
          tone="teal"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
        />
        <StatCard
          label={t('stats.totalVisits')}
          value={visits.length}
          delay={0.16}
          change={t('changes.completed', { count: closedVisits })}
          tone="violet"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2 M9 5a2 2 0 002 2h2a2 2 0 002-2 M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <StatCard
          label={t('stats.openVisits')}
          value={openVisits}
          delay={0.24}
          change={openVisits > 0 ? t('changes.inProgress') : t('changes.allClosed')}
          tone="amber"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
          }
        />
      </div>

      {/* Main Grid */}
      <div className="db-main-grid">

        {/* Visit Activity Chart */}
        <motion.div
          className="card db-card-chart"
          style={{ padding: 24 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--gray-900)' }}>{t('visitActivity.title')}</h3>
            <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>{t('visitActivity.thisWeek')}</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 12 }}>
            {t('visitActivity.subtitle')}
          </p>
          <WeeklyBarChart visits={visits} />
        </motion.div>

        {/* Audit Progress */}
        <motion.div
          className="card db-card-progress"
          style={{ padding: 24 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38, duration: 0.4 }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--gray-900)', marginBottom: 4 }}>{t('auditProgress.title')}</h3>
          <p style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 8 }}>
            {t('auditProgress.subtitle')}
          </p>
          <SemiCircle percentage={auditCompletion} />
        </motion.div>

        {/* Recent Stores (right column, spans 2 rows on desktop) */}
        <motion.div
          className="card db-col-sidebar db-card-sidebar"
          style={{ padding: 24 }}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.32, duration: 0.4 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--gray-900)' }}>{t('stores.title')}</h3>
            <button
              onClick={() => navigate('/stores')}
              style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {t('stores.viewAll')}
            </button>
          </div>

          <AnimatePresence>
            {stores.slice(0, 8).map((store, i) => (
              <motion.div
                key={store.id}
                className="quick-list-item"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.05 }}
              >
                <div
                  className="quick-dot"
                  style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                />
                <div className="quick-list-info">
                  <div className="quick-list-name">{store.name}</div>
                  <div className="quick-list-meta">{store.region?.name || store.address || '—'}</div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {stores.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--gray-400)', textAlign: 'center', padding: '20px 0' }}>
              {t('stores.empty')}
            </p>
          )}

          {/* Time Tracker below stores */}
          <div style={{ marginTop: 20 }}>
            <TimeTracker hasOpenVisit={hasOpenVisit} />
          </div>
        </motion.div>

        {/* Team / Recent Visits row */}
        <motion.div
          className="card db-card-team"
          style={{ padding: 24 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.44, duration: 0.4 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--gray-900)' }}>
              {users.length > 0 ? t('team.titleMembers') : t('team.titleVisits')}
            </h3>
            <button
              onClick={() => navigate(users.length > 0 ? '/users' : '/visits')}
              style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {t('team.viewAll')}
            </button>
          </div>

          {users.length > 0
            ? users.slice(0, 5).map((u, i) => (
                <motion.div
                  key={u.id}
                  className="team-row"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.06 }}
                >
                  <div
                    className="team-avatar"
                    style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                  >
                    {u.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="team-info">
                    <div className="team-name">{u.full_name}</div>
                    <div className="team-role">{tCommon(`roles.${u.role}`)}</div>
                  </div>
                  <Badge variant={u.role === 'merchandiser' ? 'success' : u.role === 'supervisor' ? 'warning' : 'primary'}>
                    {tCommon(`roles.${u.role}`)}
                  </Badge>
                </motion.div>
              ))
            : visits.slice(0, 5).map((v, i) => (
                <motion.div
                  key={v.id}
                  className="team-row"
                  style={{ cursor: 'pointer' }}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.06 }}
                  onClick={() => navigate(`/visits/${v.id}`)}
                  whileHover={{ x: 2 }}
                >
                  <div
                    className="team-avatar"
                    style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                    </svg>
                  </div>
                  <div className="team-info">
                    <div className="team-name">{v.store?.name || v.store_id}</div>
                    <div className="team-role">{formatDate(v.checkin_at, i18n.language)}</div>
                  </div>
                  <Badge variant={v.status === 'open' ? 'success' : 'gray'} dot>
                    {v.status === 'open' ? tCommon('status.open') : tCommon('status.closed')}
                  </Badge>
                </motion.div>
              ))}

          {users.length === 0 && visits.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--gray-400)', textAlign: 'center', padding: '20px 0' }}>
              {t('team.empty')}
            </p>
          )}
        </motion.div>

        {/* Recent Visits */}
        <motion.div
          className="card db-card-visits"
          style={{ padding: 24 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--gray-900)' }}>{t('recentVisits.title')}</h3>
            <button
              onClick={() => navigate('/visits')}
              style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {t('recentVisits.seeAll')}
            </button>
          </div>

          {visits.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--gray-400)', textAlign: 'center', padding: '20px 0' }}>
              {t('recentVisits.empty')}
            </p>
          ) : (
            visits.slice(0, 4).map((v, i) => (
              <motion.div
                key={v.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  borderBottom: i < 3 ? '1px solid var(--gray-50)' : 'none',
                  cursor: 'pointer',
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55 + i * 0.06 }}
                onClick={() => navigate(`/visits/${v.id}`)}
                whileHover={{ x: 2 }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-800)' }}>
                    {v.store?.name || v.store_id}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--gray-400)', marginTop: 2 }}>
                    {formatDate(v.checkin_at, i18n.language)}
                  </div>
                </div>
                <Badge variant={v.status === 'open' ? 'success' : 'gray'} dot>
                  {v.status === 'open' ? tCommon('status.open') : tCommon('status.closed')}
                </Badge>
              </motion.div>
            ))
          )}
        </motion.div>

      </div>
    </motion.div>
  );
}
