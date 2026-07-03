import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import VisitsReport from './VisitsReport';
import StoreReport from './StoreReport';
import ProductReport from './ProductReport';

type ReportTab = 'visits' | 'store' | 'product';

export default function ReportsPage() {
  const { t } = useTranslation('reports');
  const [tab, setTab] = useState<ReportTab>('visits');

  return (
    <div>
      <div style={{ marginBottom: 4 }}>
        <h1 className="page-title">{t('page.title')}</h1>
        <p className="page-subtitle">{t('page.subtitle')}</p>
      </div>

      <div className="tabs" style={{ marginTop: 20 }}>
        {(['visits', 'store', 'product'] as ReportTab[]).map((t2) => (
          <button
            key={t2}
            className={`tab-item ${tab === t2 ? 'active' : ''}`}
            onClick={() => setTab(t2)}
          >
            {t(`page.tabs.${t2}`)}
          </button>
        ))}
      </div>

      {tab === 'visits' && <VisitsReport />}
      {tab === 'store' && <StoreReport />}
      {tab === 'product' && <ProductReport />}
    </div>
  );
}
