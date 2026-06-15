import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../../components/ui/Button';
import type { Store } from '../../types';

type GpsState = 'locating' | 'success' | 'error';

interface Props {
  stores: Store[];
  onSubmit: (data: { store_id: string; lat: number; lng: number }) => Promise<void>;
  onCancel: () => void;
}

function GpsCard({ state, coords, errorMsg, onRetry }: { state: GpsState; coords: { lat: number; lng: number } | null; errorMsg: string; onRetry: () => void }) {
  return (
    <div className={`gps-card ${state}`}>
      <div className="gps-card-icon">
        {state === 'locating' && (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
            <line x1="12" y1="2" x2="12" y2="5" /><line x1="12" y1="19" x2="12" y2="22" />
            <line x1="2" y1="12" x2="5" y2="12" /><line x1="19" y1="12" x2="22" y2="12" />
          </svg>
        )}
        {state === 'success' && (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
        {state === 'error' && (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        )}
      </div>
      <div className="gps-card-body">
        <div className="gps-card-title">
          {state === 'locating' && 'Acquiring GPS…'}
          {state === 'success' && 'Location acquired'}
          {state === 'error' && 'Location failed'}
        </div>
        <div className="gps-card-sub">
          {state === 'locating' && 'Please wait, getting your exact position'}
          {state === 'success' && coords && `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`}
          {state === 'error' && errorMsg}
        </div>
      </div>
      {state === 'error' && (
        <button
          onClick={onRetry}
          style={{ background: 'var(--danger)', border: 'none', borderRadius: 8, padding: '8px 12px', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
        >
          Retry
        </button>
      )}
    </div>
  );
}

export default function CheckinForm({ stores, onSubmit, onCancel }: Props) {
  const [storeId, setStoreId] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsState, setGpsState] = useState<GpsState>('locating');
  const [gpsError, setGpsError] = useState('');
  const [loading, setLoading] = useState(false);
  const [storeError, setStoreError] = useState('');

  const acquireGps = () => {
    if (!navigator.geolocation) {
      setGpsState('error');
      setGpsError('Geolocation is not supported on this device');
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
        setGpsError('Enable location access in your browser settings');
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  // Auto-acquire GPS on mount
  useEffect(() => { acquireGps(); }, []);

  const handleSubmit = async () => {
    if (!storeId) { setStoreError('Please select a store'); return; }
    if (!coords)  { return; }
    setStoreError('');
    setLoading(true);
    await onSubmit({ store_id: storeId, lat: coords.lat, lng: coords.lng });
    setLoading(false);
  };

  const steps = [
    gpsState === 'success' ? 'done' : gpsState === 'locating' ? 'active' : 'error',
    storeId ? 'done' : gpsState === 'success' ? 'active' : 'idle',
  ];

  return (
    <div>
      {/* Progress */}
      <div className="step-bar" style={{ marginBottom: 20 }}>
        {steps.map((s, i) => (
          <div
            key={i}
            className={`step-dot ${s === 'error' ? 'active' : s}`}
            style={s === 'error' ? { background: 'var(--danger)' } : undefined}
          />
        ))}
      </div>

      {/* GPS card */}
      <GpsCard state={gpsState} coords={coords} errorMsg={gpsError} onRetry={acquireGps} />

      {/* Store selector */}
      <AnimatePresence>
        {gpsState !== 'locating' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="form-group" style={{ marginBottom: 8 }}>
              <label className="form-label" style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, display: 'block' }}>
                Select Store
              </label>
              <select
                className="form-select"
                value={storeId}
                onChange={(e) => { setStoreId(e.target.value); setStoreError(''); }}
                style={{ borderColor: storeError ? 'var(--danger)' : undefined }}
              >
                <option value="">Choose a store…</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {storeError && <p className="form-error" style={{ marginTop: 6 }}>{storeError}</p>}
            </div>

            <p style={{ fontSize: 12, color: 'var(--gray-400)', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 24 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              You must be within 200 metres of the store
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
        <Button
          size="lg"
          onClick={handleSubmit}
          loading={loading}
          disabled={gpsState !== 'success' || !storeId}
          style={{ width: '100%' }}
        >
          {gpsState === 'locating' ? 'Waiting for GPS…' : 'Check In Now'}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={loading} style={{ width: '100%' }}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
