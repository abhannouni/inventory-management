import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import {
  hrApi,
  type AttendancePolicy,
  type AttendancePolicyInput,
  type AttendancePolicyRules,
  type WorkLocationRow,
} from '../../api/hr.api';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import Toggle from '../../components/ui/Toggle';

interface Props {
  employee: { id: string; full_name: string };
  onCancel: () => void;
  onDone: () => void;
}

const MARGIN_OPTIONS = [0, 15, 30, 45, 60, 90, 120];

/**
 * Starting points only — every field stays editable afterwards, and nothing
 * on the server knows about them. Any employee can get any combination.
 */
const PRESETS: Record<string, Partial<AttendancePolicyRules>> = {
  office: { allow_work_locations: true, allow_visit_stores: false, allow_assigned_stores: false },
  field: { allow_work_locations: false, allow_visit_stores: true, allow_assigned_stores: false, visit_scope: 'visit_period' },
  hybrid: { allow_work_locations: true, allow_visit_stores: true, allow_assigned_stores: false, visit_scope: 'visit_period' },
  stores: { allow_work_locations: false, allow_visit_stores: true, allow_assigned_stores: true },
};

/** One employee's location rules: where their clocked time counts as being at work. */
export default function AttendancePolicyForm({ employee, onCancel, onDone }: Props) {
  const { t } = useTranslation('hr');
  const { t: tCommon } = useTranslation('common');
  const [policy, setPolicy] = useState<AttendancePolicy | null>(null);
  const [locations, setLocations] = useState<WorkLocationRow[] | null>(null);
  const [form, setForm] = useState<AttendancePolicyInput | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([hrApi.policy(employee.id), hrApi.locations()])
      .then(([p, l]) => {
        setPolicy(p);
        setLocations(l);
        setForm({
          enabled: p.configured ? p.enabled : true,
          allow_work_locations: p.allow_work_locations,
          allow_visit_stores: p.allow_visit_stores,
          allow_assigned_stores: p.allow_assigned_stores,
          visit_scope: p.visit_scope,
          visit_margin_minutes: p.visit_margin_minutes,
          store_radius_meters: p.store_radius_meters,
          count_off_site: p.count_off_site,
          count_unverified: p.count_unverified,
          work_location_ids: p.work_locations.map((l) => l.id),
          note: p.note ?? '',
        });
      })
      .catch((e: Error) => setLoadError(e.message));
  }, [employee.id]);

  if (loadError) return <p className="form-error">{loadError}</p>;
  if (!form || !policy || !locations) return <Spinner center />;

  const set = <K extends keyof AttendancePolicyInput>(key: K, value: AttendancePolicyInput[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const toggleLocation = (id: string) =>
    set(
      'work_location_ids',
      form.work_location_ids.includes(id)
        ? form.work_location_ids.filter((x) => x !== id)
        : [...form.work_location_ids, id],
    );

  const usesStores = form.allow_visit_stores || form.allow_assigned_stores;
  const error = !form.enabled
    ? null
    : !form.allow_work_locations && !form.allow_visit_stores && !form.allow_assigned_stores
      ? t('policy.errors.noPlace')
      : form.allow_work_locations && !form.work_location_ids.length
        ? t('policy.errors.noLocation')
        : null;

  const submit = async () => {
    if (error) return;
    setSaving(true);
    try {
      await hrApi.setPolicy(employee.id, { ...form, note: form.note?.trim() || undefined });
      toast.success(t('policy.saved'));
      onDone();
    } catch (e) {
      toast.error((e as Error).message || t('errors.saveFailed'));
      setSaving(false);
    }
  };

  return (
    <div className="wh-policy">
      <div className="wh-policy-switch">
        <div>
          <strong>{t('policy.enabled')}</strong>
          <span className="wh-muted">{t('policy.enabledHint')}</span>
        </div>
        <Toggle checked={form.enabled} onChange={(v) => set('enabled', v)} />
      </div>

      {form.enabled ? (
        <>
          <div className="wh-editor-presets">
            <span className="wh-editor-presets-label">{t('policy.presets')}</span>
            {Object.keys(PRESETS).map((key) => (
              <button
                key={key}
                type="button"
                className="wh-chip"
                title={t(`policy.preset.${key}.hint`)}
                onClick={() => setForm((f) => (f ? { ...f, ...PRESETS[key] } : f))}
              >
                {t(`policy.preset.${key}.label`)}
              </button>
            ))}
          </div>

          <h3 className="wh-policy-heading">{t('policy.placesTitle')}</h3>

          {/* ── Work locations ── */}
          <div className={`wh-policy-block ${form.allow_work_locations ? 'is-on' : ''}`}>
            <label className="wh-policy-option">
              <input
                type="checkbox"
                checked={form.allow_work_locations}
                onChange={(e) => set('allow_work_locations', e.target.checked)}
              />
              <span>
                <span className="form-check-card-title">{t('policy.workLocations')}</span>
                <span className="form-check-card-hint">{t('policy.workLocationsHint')}</span>
              </span>
            </label>
            {form.allow_work_locations && (
              <div className="wh-policy-sub">
                {locations.length === 0 ? (
                  <p className="wh-notice">
                    {t('policy.noLocations')}{' '}
                    <Link to="/hr?tab=locations" className="wh-link">{t('policy.manageLocations')}</Link>
                  </p>
                ) : (
                  <div className="wh-policy-locations">
                    {locations.map((l) => (
                      <label key={l.id} className={`wh-policy-location ${l.is_active ? '' : 'is-inactive'}`}>
                        <input
                          type="checkbox"
                          checked={form.work_location_ids.includes(l.id)}
                          onChange={() => toggleLocation(l.id)}
                        />
                        <span>
                          <strong>{l.name}</strong>
                          <span className="wh-muted">
                            {l.address ? `${l.address} · ` : ''}
                            {t('locations.radius', { meters: l.radius_meters })}
                            {!l.is_active && ` · ${t('locations.inactive')}`}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Visit stores ── */}
          <div className={`wh-policy-block ${form.allow_visit_stores ? 'is-on' : ''}`}>
            <label className="wh-policy-option">
              <input
                type="checkbox"
                checked={form.allow_visit_stores}
                onChange={(e) => set('allow_visit_stores', e.target.checked)}
              />
              <span>
                <span className="form-check-card-title">{t('policy.visitStores')}</span>
                <span className="form-check-card-hint">{t('policy.visitStoresHint')}</span>
              </span>
            </label>
            {form.allow_visit_stores && (
              <div className="wh-policy-sub">
                <div className="wh-mode-grid wh-mode-grid-2">
                  {(['visit_period', 'visit_day'] as const).map((scope) => (
                    <label key={scope} className={`wh-mode ${form.visit_scope === scope ? 'is-active' : ''}`}>
                      <input
                        type="radio"
                        name="visit-scope"
                        checked={form.visit_scope === scope}
                        onChange={() => set('visit_scope', scope)}
                      />
                      <span className="wh-mode-title">{t(`policy.scope.${scope}.label`)}</span>
                      <span className="wh-mode-hint">{t(`policy.scope.${scope}.hint`)}</span>
                    </label>
                  ))}
                </div>
                {form.visit_scope === 'visit_period' && (
                  <div className="form-group">
                    <label className="form-label" htmlFor="policy-margin">{t('policy.margin')}</label>
                    <select
                      id="policy-margin"
                      className="form-select"
                      value={form.visit_margin_minutes}
                      onChange={(e) => set('visit_margin_minutes', Number(e.target.value))}
                    >
                      {MARGIN_OPTIONS.map((m) => (
                        <option key={m} value={m}>
                          {m === 0 ? t('policy.marginNone') : t('policy.marginOption', { minutes: m })}
                        </option>
                      ))}
                    </select>
                    <p className="form-hint">{t('policy.marginHint')}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Assigned stores ── */}
          <div className={`wh-policy-block ${form.allow_assigned_stores ? 'is-on' : ''}`}>
            <label className="wh-policy-option">
              <input
                type="checkbox"
                checked={form.allow_assigned_stores}
                onChange={(e) => set('allow_assigned_stores', e.target.checked)}
              />
              <span>
                <span className="form-check-card-title">{t('policy.assignedStores')}</span>
                <span className="form-check-card-hint">
                  {t('policy.assignedStoresHint', { count: policy.assigned_stores.total })}
                </span>
              </span>
            </label>
          </div>

          {usesStores && (
            <>
              {policy.assigned_stores.without_coordinates > 0 && (
                <p className="wh-notice">
                  {t('policy.storesWithoutCoordinates', { count: policy.assigned_stores.without_coordinates })}
                </p>
              )}
              <div className="form-group">
                <label className="form-label" htmlFor="policy-radius">{t('policy.storeRadius')}</label>
                <input
                  id="policy-radius"
                  type="number"
                  className="form-input"
                  min={20}
                  max={5000}
                  step={10}
                  value={form.store_radius_meters}
                  onChange={(e) => set('store_radius_meters', Math.round(Number(e.target.value)) || 0)}
                />
                <p className="form-hint">{t('policy.storeRadiusHint')}</p>
              </div>
            </>
          )}

          <h3 className="wh-policy-heading">{t('policy.countingTitle')}</h3>
          <label className="form-check-card">
            <input
              type="checkbox"
              checked={form.count_off_site}
              onChange={(e) => set('count_off_site', e.target.checked)}
            />
            <span>
              <span className="form-check-card-title">{t('policy.countOffSite')}</span>
              <span className="form-check-card-hint">{t('policy.countOffSiteHint')}</span>
            </span>
          </label>
          <label className="form-check-card">
            <input
              type="checkbox"
              checked={form.count_unverified}
              onChange={(e) => set('count_unverified', e.target.checked)}
            />
            <span>
              <span className="form-check-card-title">{t('policy.countUnverified')}</span>
              <span className="form-check-card-hint">{t('policy.countUnverifiedHint')}</span>
            </span>
          </label>
        </>
      ) : (
        <p className="wh-notice is-info">{t('policy.disabledInfo')}</p>
      )}

      <div className="form-group">
        <label className="form-label" htmlFor="policy-note">{t('records.note')}</label>
        <input
          id="policy-note"
          className="form-input"
          value={form.note ?? ''}
          maxLength={500}
          placeholder={t('policy.notePlaceholder')}
          onChange={(e) => set('note', e.target.value)}
        />
      </div>

      {policy.updated_at && (
        <p className="wh-muted">
          {t('policy.lastUpdated', {
            name: policy.updated_by?.full_name ?? '—',
            date: new Date(policy.updated_at).toLocaleString(),
          })}
        </p>
      )}

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
