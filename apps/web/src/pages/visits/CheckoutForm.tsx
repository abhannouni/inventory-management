import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../../components/ui/Button';
import { formatDate } from '../../utils/format';
import type { Visit } from '../../types';

interface Props {
  visit: Visit;
  onSubmit: (data: { lat: number; lng: number; checkout_at?: string }) => Promise<void>;
  onCancel: () => void;
}

export default function CheckoutForm({ visit, onSubmit, onCancel }: Props) {
  const { t, i18n } = useTranslation('visits');
  const [loading, setLoading] = useState(false);

  const lat = visit.store?.latitude != null ? Number(visit.store.latitude) : null;
  const lng = visit.store?.longitude != null ? Number(visit.store.longitude) : null;
  const hasCoords = lat != null && lng != null;

  const handleCheckout = async () => {
    if (!hasCoords) return;
    setLoading(true);
    await onSubmit({ lat: lat!, lng: lng!, checkout_at: new Date().toISOString() });
    setLoading(false);
  };

  return (
    <div>
      <div style={{ background: 'var(--primary-light)', borderRadius: 12, padding: '14px 16px', marginBottom: 16, border: '1px solid var(--accent-light)' }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--gray-400)', marginBottom: 6 }}>{t('checkout.activeVisit')}</p>
        <p style={{ fontSize: 17, fontWeight: 800, color: 'var(--gray-900)', marginBottom: 4 }}>{visit.store?.name}</p>
        <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>{t('checkout.checkedInAt', { date: formatDate(visit.checkin_at, i18n.language) })}</p>
      </div>

      {hasCoords && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--primary-light)', border: '1px solid var(--accent-light)',
          borderRadius: 10, padding: '10px 14px', marginBottom: 16,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/>
          </svg>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)' }}>{visit.store?.address || visit.store?.name}</div>
            <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 1 }}>{lat!.toFixed(6)}, {lng!.toFixed(6)}</div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Button size="lg" onClick={handleCheckout} loading={loading} disabled={!hasCoords} style={{ width: '100%' }}>
          {t('checkout.confirmCheckOut')}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={loading} style={{ width: '100%' }}>
          {t('checkout.cancel')}
        </Button>
      </div>
    </div>
  );
}
