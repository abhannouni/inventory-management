import { useState, useEffect } from 'react';
import Button from '../../components/ui/Button';
import { formatDate } from '../../utils/format';
import type { Visit } from '../../types';

interface Props {
  visit: Visit;
  onSubmit: (data: { lat: number; lng: number; checkout_at?: string }) => Promise<void>;
  onCancel: () => void;
}

function CoordInput({ onChange }: { onChange: (c: { lat: number; lng: number } | null) => void }) {
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');

  const isValid =
    lat.trim() !== '' && lng.trim() !== '' &&
    !isNaN(Number(lat)) && !isNaN(Number(lng)) &&
    Math.abs(Number(lat)) <= 90 && Math.abs(Number(lng)) <= 180;

  useEffect(() => {
    onChange(isValid ? { lat: Number(lat), lng: Number(lng) } : null);
  }, [lat, lng]);

  return (
    <div className={`coord-input-card ${isValid ? 'valid' : ''}`}>
      <div className="coord-input-header">
        <div className="coord-input-icon">
          {isValid ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
              <line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/>
              <line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>
            </svg>
          )}
        </div>
        <div>
          <div className="coord-input-title">{isValid ? 'Location set' : 'Enter checkout coordinates'}</div>
          <div className="coord-input-sub">Testing mode — enter lat / lng manually</div>
        </div>
      </div>
      <div className="coord-fields">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: 11 }}>Latitude</label>
          <input className="form-input" placeholder="e.g. 33.5731" value={lat} inputMode="decimal"
            onChange={(e) => setLat(e.target.value)} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: 11 }}>Longitude</label>
          <input className="form-input" placeholder="e.g. -7.5898" value={lng} inputMode="decimal"
            onChange={(e) => setLng(e.target.value)} />
        </div>
      </div>
    </div>
  );
}

export default function CheckoutForm({ visit, onSubmit, onCancel }: Props) {
  const [coords, setCoords]   = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    if (!coords) return;
    setLoading(true);
    await onSubmit({ lat: coords.lat, lng: coords.lng, checkout_at: new Date().toISOString() });
    setLoading(false);
  };

  return (
    <div>
      {/* Visit summary */}
      <div style={{ background: 'linear-gradient(145deg,#fff,#f8f8f8)', borderRadius: 14, padding: '14px 16px', marginBottom: 20, border: '1px solid #eee', boxShadow: '4px 4px 10px rgba(0,0,0,0.06),-2px -2px 6px rgba(255,255,255,0.85)' }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--gray-400)', marginBottom: 6 }}>Active Visit</p>
        <p style={{ fontSize: 17, fontWeight: 800, color: 'var(--gray-900)', marginBottom: 4 }}>{visit.store?.name}</p>
        <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>Checked in {formatDate(visit.checkin_at)}</p>
      </div>

      <CoordInput onChange={setCoords} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
        <Button size="lg" onClick={handleCheckout} loading={loading} disabled={!coords} style={{ width: '100%' }}>
          Confirm Check Out
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={loading} style={{ width: '100%' }}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
