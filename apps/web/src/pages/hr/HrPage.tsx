import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { hrApi, type HrFilters } from '../../api/hr.api';
import PageHeader from '../../components/ui/PageHeader';
import SchedulesView from './SchedulesView';
import TrackingView from './TrackingView';
import WorkLocationsView from './WorkLocationsView';
import './hr.css';

type Tab = 'tracking' | 'schedules' | 'locations';
const TABS: Tab[] = ['tracking', 'schedules', 'locations'];

/**
 * HR → Working hours. "Tracking" is the day-by-day overview of every
 * employee; "Schedules" is where hours get assigned — by role, in bulk, or
 * to one person; "Locations" lists the agencies and offices that employees'
 * location rules can point at. The tab lives in the URL so links can open any.
 */
export default function HrPage() {
  const { t } = useTranslation('hr');
  const [params, setParams] = useSearchParams();
  const requested = params.get('tab') as Tab | null;
  const tab: Tab = requested && TABS.includes(requested) ? requested : 'tracking';
  const [filters, setFilters] = useState<HrFilters | null>(null);

  useEffect(() => {
    hrApi.filters().then(setFilters).catch(() => undefined);
  }, []);

  const setTab = (next: Tab) => setParams(next === 'tracking' ? {} : { tab: next }, { replace: true });

  return (
    <div>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <div className="tabs" role="tablist">
        {TABS.map((key) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            className={`tab-item ${tab === key ? 'active' : ''}`}
            onClick={() => setTab(key)}
          >
            {t(`tabs.${key}`)}
          </button>
        ))}
      </div>

      {tab === 'tracking' && <TrackingView filters={filters} />}
      {tab === 'schedules' && <SchedulesView filters={filters} />}
      {tab === 'locations' && <WorkLocationsView />}
    </div>
  );
}
