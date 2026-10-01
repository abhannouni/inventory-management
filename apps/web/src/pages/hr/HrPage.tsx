import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { hrApi, type HrFilters } from '../../api/hr.api';
import PageHeader from '../../components/ui/PageHeader';
import SchedulesView from './SchedulesView';
import TrackingView from './TrackingView';
import './hr.css';

type Tab = 'tracking' | 'schedules';

/**
 * HR → Working hours. "Tracking" is the day-by-day overview of every
 * employee; "Schedules" is where hours get assigned — by role, in bulk, or
 * to one person. The tab lives in the URL so links can open either one.
 */
export default function HrPage() {
  const { t } = useTranslation('hr');
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'schedules' ? 'schedules' : 'tracking';
  const [filters, setFilters] = useState<HrFilters | null>(null);

  useEffect(() => {
    hrApi.filters().then(setFilters).catch(() => undefined);
  }, []);

  const setTab = (next: Tab) => setParams(next === 'tracking' ? {} : { tab: next }, { replace: true });

  return (
    <div>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <div className="tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'tracking'}
          className={`tab-item ${tab === 'tracking' ? 'active' : ''}`}
          onClick={() => setTab('tracking')}
        >
          {t('tabs.tracking')}
        </button>
        <button
          role="tab"
          aria-selected={tab === 'schedules'}
          className={`tab-item ${tab === 'schedules' ? 'active' : ''}`}
          onClick={() => setTab('schedules')}
        >
          {t('tabs.schedules')}
        </button>
      </div>

      {tab === 'tracking' ? <TrackingView filters={filters} /> : <SchedulesView filters={filters} />}
    </div>
  );
}
