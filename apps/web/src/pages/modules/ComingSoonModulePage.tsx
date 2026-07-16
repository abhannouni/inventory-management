import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
 * Sell-Out, Merchandising, and Marketing & Trade Marketing.
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
        <div className="empty-state">
          <div className="empty-state-title">{t('notAvailable.title')}</div>
          <div className="empty-state-subtitle">
            {status?.message || t('notAvailable.hint')}
          </div>
        </div>
      )}
    </div>
  );
}
