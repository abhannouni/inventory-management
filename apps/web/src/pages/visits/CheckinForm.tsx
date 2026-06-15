import { useState } from 'react';
import { toast } from 'react-toastify';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import type { Store } from '../../types';

interface CheckinFormProps {
  stores: Store[];
  onSubmit: (data: { store_id: string; lat: number; lng: number }) => Promise<void>;
  onCancel: () => void;
}

export default function CheckinForm({ stores, onSubmit, onCancel }: CheckinFormProps) {
  const [storeId, setStoreId] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser');
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
        toast.error('Failed to get location. Please enable location access.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) { setError('Please select a store'); return; }
    if (!coords) { setError('Please get your current location first'); return; }
    setError('');
    setLoading(true);
    await onSubmit({ store_id: storeId, lat: coords.lat, lng: coords.lng });
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <p style={{ color: 'var(--gray-500)', marginBottom: 16, fontSize: 13 }}>
        You must be within 200 metres of the store to check in.
      </p>

      <Select
        label="Select Store"
        value={storeId}
        onChange={(e) => setStoreId(e.target.value)}
        options={stores.map((s) => ({ value: s.id, label: s.name }))}
        placeholder="Choose a store..."
        error={error && !storeId ? error : ''}
      />

      <div style={{ marginBottom: 16 }}>
        <label className="form-label">Your Location</label>
        {coords ? (
          <div style={{ background: 'var(--success-light)', border: '1px solid var(--success)', borderRadius: 8, padding: '10px 14px', marginTop: 6 }}>
            <p style={{ color: 'var(--success)', fontWeight: 500, fontSize: 13 }}>Location acquired ✓</p>
            <p className="gps-coords" style={{ marginTop: 4 }}>{coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}</p>
          </div>
        ) : (
          <Button
            variant="secondary"
            type="button"
            onClick={getLocation}
            loading={locating}
            style={{ marginTop: 6, width: '100%' }}
            icon={<GpsIcon />}
          >
            {locating ? 'Getting location…' : 'Get My Location'}
          </Button>
        )}
        {error && coords && storeId && <p className="form-error" style={{ marginTop: 6 }}>{error}</p>}
      </div>

      {error && (!coords || !storeId) && <p className="form-error" style={{ marginBottom: 12 }}>{error}</p>}

      <div className="form-actions">
        <Button variant="ghost" type="button" onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button type="submit" loading={loading} disabled={!coords || !storeId}>Check In</Button>
      </div>
    </form>
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
