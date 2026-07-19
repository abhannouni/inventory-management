import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import PageHeader from '../../components/ui/PageHeader';
import Spinner from '../../components/ui/Spinner';
import type { ModuleStatus } from '../../api/modules.api';

interface ComingSoonModulePageProps {
  titleKey: string;
  subtitleKey: string;
  /** Fetches this module's status from its own guarded backend endpoint — proves
   *  the permission gate is real, not just a static frontend page. */
  fetchStatus: () => Promise<ModuleStatus>;
}

/**
 * Shared shell for modules that are permission-gated end-to-end (nav, route,
 * and a real guarded API endpoint) but have no data model yet. Used by
 * Sell-Out, Merchandising, Marketing & Trade Marketing, and HR.
 *
 * This is deliberately honest rather than showing fabricated data: the page is
 * fully wired into the permission system today, and only the feature body is
 * pending.
 */
export default function ComingSoonModulePage({
  titleKey,
  subtitleKey,
  fetchStatus,
}: ComingSoonModulePageProps) {
  const { t } = useTranslation('modules');
  const [status, setStatus] = useState<ModuleStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchStatus()
      .then((s) => !cancelled && setStatus(s))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [fetchStatus]);

  return (
    <div>
      <PageHeader title={t(titleKey)} subtitle={t(subtitleKey)} />

      {loading ? (
        <Spinner center size="lg" />
      ) : (
        <div className="module-soon">
          <motion.div
            className="module-soon-icon"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a7 7 0 00-4.95 11.95L8 16h8l.95-2.05A7 7 0 0012 2z" />
              <circle cx="12" cy="9" r="2.2" />
              <path d="M9 19h6M10 22h4" />
            </svg>
          </motion.div>

          <motion.div
            className="module-soon-badge"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            {t('notAvailable.badge')}
          </motion.div>

          <motion.div
            className="module-soon-title"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
          >
            {t('notAvailable.title')}
          </motion.div>

          <motion.div
            className="module-soon-subtitle"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
          >
            {status?.message || t('notAvailable.hint')}
          </motion.div>

          <div className="module-soon-dots">
            <span />
            <span />
            <span />
          </div>
        </div>
      )}
    </div>
  );
}
