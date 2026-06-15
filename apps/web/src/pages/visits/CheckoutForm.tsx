import { useState } from 'react';
import { toast } from 'react-toastify';
import Button from '../../components/ui/Button';
import { formatDate } from '../../utils/format';
import type { Visit } from '../../types';

interface CheckoutFormProps {
  visit: Visit;
  onSubmit: (data: { lat: number; lng: number }) => Promise<void>;
  onCancel: () => void;
}

export default function CheckoutForm({ visit, onSubmit, onCancel }: CheckoutFormProps) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(false);

  const getLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
        toast.success('Location acquired!');
      },
      () => {
        setLocating(false);
        toast.error('Failed to get location');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleCheckout = async () => {
    if (!coords) { toast.error('Please get your location first'); return; }
    setLoading(true);
    await onSubmit(coords);
    setLoading(false);
  };

  return (
    <div>
      <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
        <div className="detail-item">
          <span className="detail-label">Store</span>
          <span className="detail-value">{visit.store?.name}</span>
        </div>
        <div className="detail-item" style={{ marginTop: 8 }}>
          <span className="detail-label">Checked In</span>
          <span className="detail-value">{formatDate(visit.checkin_at)}</span>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        {coords ? (
          <div style={{ background: 'var(--success-light)', border: '1px solid var(--success)', borderRadius: 8, padding: '10px 14px' }}>
            <p style={{ color: 'var(--success)', fontWeight: 500, fontSize: 13 }}>Location acquired ✓</p>
            <p className="gps-coords" style={{ marginTop: 4 }}>{coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}</p>
          </div>
        ) : (
          <Button variant="secondary" type="button" onClick={getLocation} loading={locating} style={{ width: '100%' }} icon={<GpsIcon />}>
            {locating ? 'Getting location…' : 'Get My Location'}
          </Button>
        )}
      </div>

      <div className="form-actions">
        <Button variant="ghost" onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button onClick={handleCheckout} loading={loading} disabled={!coords}>Check Out</Button>
      </div>
    </div>
  );
}

function GpsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
      <line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" />
      <line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" />
    </svg>
  );
}
