import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../../components/ui/Button';
import VisitTimer from '../../components/ui/VisitTimer';
import { formatDate } from '../../utils/format';
import { getCurrentPosition, geolocationErrorMessage } from '../../utils/geolocation';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import type { Visit } from '../../types';

interface Props {
  visit: Visit;
  onSubmit: (data: { lat?: number; lng?: number }) => Promise<void>;
  onCancel: () => void;
}

export default function CheckoutForm({ visit, onSubmit, onCancel }: Props) {
  const { t, i18n } = useTranslation('visits');
  // Super_admin-controlled — see the Settings page. Defaults to required
  // (fail-safe) until the flag's real state loads.
  const gpsRequired = useFeatureFlag('visits.gps_required', true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const lat = visit.store?.latitude != null ? Number(visit.store.latitude) : null;
  const lng = visit.store?.longitude != null ? Number(visit.store.longitude) : null;
  const hasCoords = lat != null && lng != null;
  const canSubmit = !gpsRequired || hasCoords;

  const handleCheckout = async () => {
    if (!canSubmit) return;
    setError('');
    setLoading(true);

    if (!gpsRequired) {
      // The server stamps check-out and computes the stored duration.
      await onSubmit({});
      setLoading(false);
      return;
    }

    // The user's real device GPS is sent — the server checks it is within the
    // store's zone. Sending the store's own coordinates would defeat the check.
    let position;
    try {
      position = await getCurrentPosition();
    } catch (err) {
      setError(geolocationErrorMessage(err, t));
      setLoading(false);
      return;
    }
    await onSubmit({ lat: position.lat, lng: position.lng });
    setLoading(false);
  };

  return (
    <div>
      <div style={{ background: 'var(--primary-light)', borderRadius: 12, padding: '14px 16px', marginBottom: 16, border: '1px solid var(--accent-light)' }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--gray-400)', marginBottom: 6 }}>{t('checkout.activeVisit')}</p>
        <p style={{ fontSize: 17, fontWeight: 800, color: 'var(--gray-900)', marginBottom: 4 }}>{visit.store?.name}</p>
        <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>{t('checkout.checkedInAt', { date: formatDate(visit.checkin_at, i18n.language) })}</p>
        <div style={{ marginTop: 10 }}>
          <VisitTimer visit={visit} variant="inline" />
        </div>
      </div>

      {gpsRequired && hasCoords && (
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

      {error && <p className="form-error" style={{ marginBottom: 10 }}>{error}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Button size="lg" onClick={handleCheckout} loading={loading} disabled={!canSubmit} style={{ width: '100%' }}>
          {t('checkout.confirmCheckOut')}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={loading} style={{ width: '100%' }}>
          {t('checkout.cancel')}
        </Button>
      </div>
    </div>
  );
}
