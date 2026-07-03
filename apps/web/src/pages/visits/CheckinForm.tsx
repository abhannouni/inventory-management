import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../../components/ui/Button';
import type { Store } from '../../types';

interface Props {
  stores: Store[];
  onSubmit: (data: { store_id: string; lat: number; lng: number; checkin_at?: string }) => Promise<void>;
  onCancel: () => void;
}

export default function CheckinForm({ stores, onSubmit, onCancel }: Props) {
  const { t } = useTranslation('visits');
  const [storeId, setStoreId] = useState('');
  const [loading, setLoading] = useState(false);
  const [storeError, setStoreError] = useState('');

  const selectedStore = stores.find((s) => s.id === storeId) ?? null;
  const hasCoords = selectedStore?.latitude != null && selectedStore?.longitude != null;

  const handleSubmit = async () => {
    if (!storeId) { setStoreError(t('checkin.errors.storeRequired')); return; }
    if (!selectedStore || !hasCoords) {
      setStoreError(t('checkin.errors.noGpsCoordinates'));
      return;
    }
    setStoreError('');
    setLoading(true);
    await onSubmit({
      store_id: storeId,
      lat: Number(selectedStore.latitude),
      lng: Number(selectedStore.longitude),
      checkin_at: new Date().toISOString(),
    });
    setLoading(false);
  };

  return (
    <div>
      <div className="form-group" style={{ marginBottom: 8 }}>
        <label className="form-label">{t('checkin.selectStore')}</label>
        <select
          className="form-select"
          value={storeId}
          onChange={(e) => { setStoreId(e.target.value); setStoreError(''); }}
          style={{ borderColor: storeError ? 'var(--danger)' : undefined }}
        >
          <option value="">{t('checkin.chooseStore')}</option>
          {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {storeError && <p className="form-error" style={{ marginTop: 6 }}>{storeError}</p>}
      </div>

      {selectedStore && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: hasCoords ? 'var(--primary-light)' : 'var(--gray-100)',
          border: `1px solid ${hasCoords ? 'var(--accent-light)' : 'var(--gray-200)'}`,
          borderRadius: 10, padding: '10px 14px', marginBottom: 4,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke={hasCoords ? 'var(--primary)' : 'var(--gray-400)'}
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/>
          </svg>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: hasCoords ? 'var(--primary)' : 'var(--gray-500)' }}>
              {selectedStore.address || selectedStore.name}
            </div>
            {hasCoords ? (
              <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 1 }}>
                {Number(selectedStore.latitude).toFixed(6)}, {Number(selectedStore.longitude).toFixed(6)}
              </div>
            ) : (
              <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 1 }}>{t('checkin.noCoordinates')}</div>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexDirection: 'column', marginTop: 16 }}>
        <Button size="lg" onClick={handleSubmit} loading={loading} disabled={!storeId || !hasCoords} style={{ width: '100%' }}>
          {t('checkin.checkInNow')}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={loading} style={{ width: '100%' }}>
          {t('checkin.cancel')}
        </Button>
      </div>
    </div>
  );
}
