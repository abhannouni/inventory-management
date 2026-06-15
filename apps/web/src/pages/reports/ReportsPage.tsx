import { useState } from 'react';
import VisitsReport from './VisitsReport';
import StoreReport from './StoreReport';
import ProductReport from './ProductReport';

type ReportTab = 'visits' | 'store' | 'product';

export default function ReportsPage() {
  const [tab, setTab] = useState<ReportTab>('visits');

  return (
    <div>
      <div style={{ marginBottom: 4 }}>
        <h1 className="page-title">Reports</h1>
        <p className="page-subtitle">Role-scoped analytics and audit history</p>
      </div>

      <div className="tabs" style={{ marginTop: 20 }}>
        {(['visits', 'store', 'product'] as ReportTab[]).map((t) => (
          <button
            key={t}
            className={`tab-item ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'visits' ? 'Visit Reports' : t === 'store' ? 'Store Report' : 'Product Report'}
          </button>
        ))}
      </div>

      {tab === 'visits' && <VisitsReport />}
      {tab === 'store' && <StoreReport />}
      {tab === 'product' && <ProductReport />}
    </div>
  );
}
