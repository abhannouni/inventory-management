import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { hrApi, type WorkLocationInput, type WorkLocationRow } from '../../api/hr.api';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import DataTable, { type Column } from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import { usePermissions } from '../../hooks/usePermissions';
import { getCurrentPosition } from '../../utils/geolocation';
import LocationPickerMap from './LocationPickerMap';

/**
 * Agencies, offices and other fixed places employees may work from. Each
 * employee's location rules pick which of these count for them.
 */
export default function WorkLocationsView() {
  const { t } = useTranslation('hr');
  const { t: tCommon } = useTranslation('common');
  const { can } = usePermissions();
  const canManage = can('hr.manage');

  const [rows, setRows] = useState<WorkLocationRow[] | null>(null);
  const [editing, setEditing] = useState<WorkLocationRow | 'new' | null>(null);
  const [deleting, setDeleting] = useState<WorkLocationRow | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    hrApi
      .locations()
      .then(setRows)
      .catch((e: Error) => toast.error(e.message));
  }, []);

  useEffect(load, [load]);

  const handleDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await hrApi.removeLocation(deleting.id);
      toast.success(t('locations.deleted'));
      setDeleting(null);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<WorkLocationRow>[] = [
    {
      key: 'name',
      header: t('locations.name'),
      render: (l) => (
        <div>
          <strong>{l.name}</strong>
          {!l.is_active && <span className="wh-tag">{t('locations.inactive')}</span>}
          {l.address && <div className="wh-muted">{l.address}</div>}
        </div>
      ),
    },
    {
      key: 'coords',
      header: t('locations.coordinates'),
      hideOnMobile: true,
      render: (l) => (
        <a
          className="wh-link"
          href={`https://www.google.com/maps?q=${l.latitude},${l.longitude}`}
          target="_blank"
          rel="noreferrer"
        >
          {l.latitude.toFixed(5)}, {l.longitude.toFixed(5)}
        </a>
      ),
    },
    {
      key: 'radius',
      header: t('locations.radiusLabel'),
      render: (l) => <span className="wh-num">{l.radius_meters} m</span>,
    },
    {
      key: 'employees',
      header: t('locations.employees'),
      render: (l) => <span className="wh-num">{l.employee_count}</span>,
    },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: tCommon('table.actions'),
            render: (l: WorkLocationRow) => (
              <div className="table-actions">
                <Button size="sm" variant="outline" onClick={() => setEditing(l)}>
                  {tCommon('actions.edit')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDeleting(l)}>
                  {tCommon('actions.delete')}
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="wh-stack">
      <section className="card wh-section">
        <div className="wh-section-head">
          <div>
            <h2 className="wh-section-title">{t('locations.title')}</h2>
            <p className="wh-section-sub">{t('locations.subtitle')}</p>
          </div>
          {canManage && <Button onClick={() => setEditing('new')}>{t('locations.add')}</Button>}
        </div>
        <DataTable
          columns={columns}
          data={rows ?? []}
          loading={!rows}
          keyExtractor={(l) => l.id}
          emptyMessage={t('locations.empty')}
        />
      </section>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? t('locations.addTitle') : t('locations.editTitle')}
        size="lg"
      >
        {editing && (
          <WorkLocationForm
            location={editing === 'new' ? undefined : editing}
            onCancel={() => setEditing(null)}
            onDone={() => {
              setEditing(null);
              load();
            }}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={busy}
        title={t('locations.deleteTitle')}
        message={t('locations.deleteMessage', { count: deleting?.employee_count ?? 0 })}
      />
    </div>
  );
}

interface FormProps {
  location?: WorkLocationRow;
  onCancel: () => void;
  onDone: () => void;
}

function WorkLocationForm({ location, onCancel, onDone }: FormProps) {
  const { t } = useTranslation('hr');
  const { t: tCommon } = useTranslation('common');
  const [name, setName] = useState(location?.name ?? '');
  const [address, setAddress] = useState(location?.address ?? '');
  const [lat, setLat] = useState(location ? String(location.latitude) : '');
  const [lng, setLng] = useState(location ? String(location.longitude) : '');
  const [radius, setRadius] = useState(String(location?.radius_meters ?? 150));
  const [active, setActive] = useState(location?.is_active ?? true);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  const latN = Number(lat);
  const lngN = Number(lng);
  const radiusN = Number(radius);
  const pinValid =
    lat !== '' && lng !== '' && Number.isFinite(latN) && Number.isFinite(lngN) && Math.abs(latN) <= 90 && Math.abs(lngN) <= 180;
  const error = !name.trim()
    ? t('locations.errors.name')
    : !pinValid
      ? t('locations.errors.coordinates')
      : !Number.isInteger(radiusN) || radiusN < 20 || radiusN > 5000
        ? t('locations.errors.radius')
        : null;

  const useMyPosition = async () => {
    setLocating(true);
    try {
      const pos = await getCurrentPosition();
      setLat(pos.lat.toFixed(7));
      setLng(pos.lng.toFixed(7));
    } catch {
      toast.error(t('clock.noPosition'));
    } finally {
      setLocating(false);
    }
  };

  const submit = async () => {
    if (error) return;
    setSaving(true);
    const payload: WorkLocationInput = {
      name: name.trim(),
      address: address.trim() || undefined,
      latitude: latN,
      longitude: lngN,
      radius_meters: radiusN,
      is_active: active,
    };
    try {
      if (location) await hrApi.updateLocation(location.id, payload);
      else await hrApi.createLocation(payload);
      toast.success(t('locations.saved'));
      onDone();
    } catch (e) {
      toast.error((e as Error).message || t('errors.saveFailed'));
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="form-group">
        <label className="form-label" htmlFor="loc-name">{t('locations.name')}</label>
        <input id="loc-name" className="form-input" value={name} maxLength={120} placeholder={t('locations.namePlaceholder')} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="loc-address">{t('locations.address')}</label>
        <input id="loc-address" className="form-input" value={address} maxLength={300} onChange={(e) => setAddress(e.target.value)} />
      </div>
      <div className="wh-picker-head">
        <span className="form-label" style={{ margin: 0 }}>{t('locations.position')}</span>
        <Button size="sm" variant="outline" type="button" onClick={useMyPosition} loading={locating}>
          {t('locations.useMyPosition')}
        </Button>
      </div>
      <LocationPickerMap
        lat={pinValid ? latN : null}
        lng={pinValid ? lngN : null}
        radiusMeters={radiusN >= 20 && radiusN <= 5000 ? radiusN : 0}
        onChange={(newLat, newLng) => {
          setLat(String(newLat));
          setLng(String(newLng));
        }}
      />
      <div className="form-row" style={{ marginTop: 12 }}>
        <div className="form-group">
          <label className="form-label" htmlFor="loc-lat">{t('locations.latitude')}</label>
          <input id="loc-lat" className="form-input" inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value.trim())} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="loc-lng">{t('locations.longitude')}</label>
          <input id="loc-lng" className="form-input" inputMode="decimal" value={lng} onChange={(e) => setLng(e.target.value.trim())} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="loc-radius">{t('locations.radiusLabel')}</label>
        <input id="loc-radius" type="number" className="form-input" min={20} max={5000} step={10} value={radius} onChange={(e) => setRadius(e.target.value)} />
        <p className="form-hint">{t('locations.radiusHint')}</p>
      </div>
      <label className="form-check-card">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        <span>
          <span className="form-check-card-title">{t('locations.active')}</span>
          <span className="form-check-card-hint">{t('locations.activeHint')}</span>
        </span>
      </label>

      {error && <p className="form-error">{error}</p>}

      <div className="form-actions">
        <Button variant="ghost" type="button" onClick={onCancel} disabled={saving}>
          {tCommon('actions.cancel')}
        </Button>
        <Button type="button" onClick={submit} loading={saving} disabled={!!error}>
          {tCommon('actions.save')}
        </Button>
      </div>
    </div>
  );
}
