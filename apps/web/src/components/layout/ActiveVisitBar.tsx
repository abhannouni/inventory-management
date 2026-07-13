import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { usePermissions } from '../../hooks/usePermissions';
import { fetchActiveVisit } from '../../store/slices/visitsSlice';
import { useVisitTimer } from '../../hooks/useVisitTimer';
import { formatDuration } from '../../utils/format';

/**
 * Persistent banner shown on every page while a visit is running.
 *
 * It is mounted in the layout rather than on a page so the timer keeps ticking
 * as the merchandiser moves around the app, and so an open visit can never be
 * silently forgotten about. The visit itself lives on the server, so this
 * rehydrates on a fresh load and picks the clock up mid-count.
 */
export default function ActiveVisitBar() {
  const { t } = useTranslation('visits');
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { canCheckin } = usePermissions();

  const visit = useAppSelector((s) => s.visits.active);
  const elapsed = useVisitTimer(visit);

  useEffect(() => {
    if (canCheckin) dispatch(fetchActiveVisit());
  }, [dispatch, canCheckin]);

  // The visits page already shows the full timer and the audit itself — a second
  // banner on top of it would just be noise.
  const onVisitPage = location.pathname.startsWith('/visits');
  if (!visit || !canCheckin || onVisitPage) return null;

  const progress = visit.audit_progress;

  return (
    <AnimatePresence>
      <motion.div
        className="active-visit-bar"
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -40, opacity: 0 }}
        transition={{ duration: 0.25 }}
        role="status"
      >
        <span className="avb-pulse" aria-hidden="true" />

        <div className="avb-body">
          <span className="avb-label">{t('timer.inProgress')}</span>
          <span className="avb-store">{visit.store?.name}</span>
        </div>

        <time className="avb-clock" dateTime={`PT${elapsed}S`}>
          {formatDuration(elapsed)}
        </time>

        {progress && progress.expected > 0 && (
          <span className="avb-progress">
            {t('activeBar.audited', {
              audited: progress.audited,
              expected: progress.expected,
            })}
          </span>
        )}

        <button
          type="button"
          className="avb-action"
          onClick={() => navigate('/visits')}
        >
          {t('activeBar.resume')}
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
