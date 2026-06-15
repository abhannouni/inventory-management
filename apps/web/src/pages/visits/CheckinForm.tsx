import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Button from '../../components/ui/Button';
import type { Store } from '../../types';

interface Props {
  stores: Store[];
  onSubmit: (data: { store_id: string; lat: number; lng: number; checkin_at?: string }) => Promise<void>;
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
          <div className="coord-input-title">{isValid ? 'Location set' : 'Enter coordinates'}</div>
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

export default function CheckinForm({ stores, onSubmit, onCancel }: Props) {
  const [storeId, setStoreId] = useState('');
  const [coords, setCoords]   = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [storeError, setStoreError] = useState('');

  const handleSubmit = async () => {
    if (!storeId) { setStoreError('Please select a store'); return; }
    if (!coords)  return;
    setStoreError('');
    setLoading(true);
    await onSubmit({ store_id: storeId, lat: coords.lat, lng: coords.lng, checkin_at: new Date().toISOString() });
    setLoading(false);
  };

  return (
    <div>
      <CoordInput onChange={setCoords} />

      <AnimatePresence>
        {coords && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <div className="form-group" style={{ marginTop: 16, marginBottom: 8 }}>
              <label className="form-label">Select Store</label>
              <select
                className="form-select"
                value={storeId}
                onChange={(e) => { setStoreId(e.target.value); setStoreError(''); }}
                style={{ borderColor: storeError ? 'var(--danger)' : undefined }}
              >
                <option value="">Choose a store…</option>
                {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {storeError && <p className="form-error" style={{ marginTop: 6 }}>{storeError}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', gap: 10, flexDirection: 'column', marginTop: 20 }}>
        <Button size="lg" onClick={handleSubmit} loading={loading} disabled={!coords || !storeId} style={{ width: '100%' }}>
          Check In Now
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={loading} style={{ width: '100%' }}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
