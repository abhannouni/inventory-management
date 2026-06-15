import { useState, useEffect } from 'react';
import Button from '../../components/ui/Button';
import { formatDate } from '../../utils/format';
import type { Visit } from '../../types';

type GpsState = 'locating' | 'success' | 'error';

interface Props {
  visit: Visit;
  onSubmit: (data: { lat: number; lng: number }) => Promise<void>;
  onCancel: () => void;
}

export default function CheckoutForm({ visit, onSubmit, onCancel }: Props) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsState, setGpsState] = useState<GpsState>('locating');
  const [gpsError, setGpsError] = useState('');
  const [loading, setLoading] = useState(false);

  const acquireGps = () => {
    if (!navigator.geolocation) {
      setGpsState('error');
      setGpsError('Geolocation not supported');
      return;
    }
    setGpsState('locating');
    setGpsError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsState('success');
      },
      () => {
        setGpsState('error');
        setGpsError('Enable location access in browser settings');
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  useEffect(() => { acquireGps(); }, []);

  const handleCheckout = async () => {
    if (!coords) return;
    setLoading(true);
    await onSubmit(coords);
    setLoading(false);
  };

  return (
    <div>
      {/* Visit summary */}
      <div style={{ background: 'var(--gray-50)', borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--gray-400)', marginBottom: 6 }}>Active Visit</p>
        <p style={{ fontSize: 17, fontWeight: 800, color: 'var(--gray-900)', marginBottom: 4 }}>{visit.store?.name}</p>
        <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>Checked in {formatDate(visit.checkin_at)}</p>
      </div>

      {/* GPS status */}
      <div className={`gps-card ${gpsState}`} style={{ marginBottom: 24 }}>
        <div className="gps-card-icon">
          {gpsState === 'locating' && (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
              <line x1="12" y1="2" x2="12" y2="5" /><line x1="12" y1="19" x2="12" y2="22" />
              <line x1="2" y1="12" x2="5" y2="12" /><line x1="19" y1="12" x2="22" y2="12" />
            </svg>
          )}
          {gpsState === 'success' && (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
          {gpsState === 'error' && (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          )}
        </div>
        <div className="gps-card-body">
          <div className="gps-card-title">
            {gpsState === 'locating' && 'Acquiring location…'}
            {gpsState === 'success' && 'Location confirmed'}
            {gpsState === 'error' && 'Location failed'}
          </div>
          <div className="gps-card-sub">
            {gpsState === 'locating' && 'Getting your checkout coordinates'}
            {gpsState === 'success' && coords && `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`}
            {gpsState === 'error' && gpsError}
          </div>
        </div>
        {gpsState === 'error' && (
          <button
            onClick={acquireGps}
            style={{ background: 'var(--danger)', border: 'none', borderRadius: 8, padding: '8px 12px', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
          >
            Retry
          </button>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Button
          size="lg"
          onClick={handleCheckout}
          loading={loading}
          disabled={gpsState !== 'success'}
          style={{ width: '100%' }}
        >
          {gpsState === 'locating' ? 'Waiting for GPS…' : 'Confirm Check Out'}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={loading} style={{ width: '100%' }}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
