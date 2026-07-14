import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import StoreMap from './StoreMap';
import { parseCoordsFromUrl } from '../../utils/maps';
import type { Region, Store } from '../../types';

interface StoreFormProps {
  regions: Region[];
  initialData?: Store;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}

/** Mirrors the API rules, so the user is told before the request is sent. */
const PHONE_RE = /^\+?[0-9][0-9\s().-]{5,19}$/;
const POSTAL_RE = /^[A-Za-z0-9][A-Za-z0-9\s-]{2,9}$/;

const str = (v: unknown) => (v == null ? '' : String(v));

export default function StoreForm({ regions, initialData, onSubmit, onCancel }: StoreFormProps) {
  const { t } = useTranslation('stores');
  const { t: tCommon } = useTranslation('common');

  const [form, setForm] = useState({
    // General
    name: str(initialData?.name),
    brand: str(initialData?.brand),
    channel: str(initialData?.channel),
    classification: str(initialData?.classification),
    // Address
    address: str(initialData?.address),
    city: str(initialData?.city),
    postal_code: str(initialData?.postal_code),
    region_id: str(initialData?.region_id),
    // A date input needs YYYY-MM-DD; the API sends a full ISO timestamp.
    opening_date: initialData?.opening_date ? String(initialData.opening_date).slice(0, 10) : '',
    // Contacts
    section_manager_name: str(initialData?.section_manager_name),
    section_manager_phone: str(initialData?.section_manager_phone),
    department_manager_name: str(initialData?.department_manager_name),
    department_manager_phone: str(initialData?.department_manager_phone),
    gds_name: str(initialData?.gds_name),
    gds_phone: str(initialData?.gds_phone),
    // Geolocation
    latitude: initialData?.latitude != null ? String(initialData.latitude) : '',
    longitude: initialData?.longitude != null ? String(initialData.longitude) : '',
    google_maps_url: str(initialData?.google_maps_url),
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  type FormKey = keyof typeof form;
  const set = (key: FormKey, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const validate = () => {
    const e: Record<string, string> = {};

    if (!form.name.trim()) e.name = t('errors.nameRequired');
    if (!form.region_id) e.region_id = t('errors.regionRequired');
    if (!form.address.trim()) e.address = t('errors.addressRequired');

    if (form.postal_code && !POSTAL_RE.test(form.postal_code.trim())) {
      e.postal_code = t('errors.postalCodeInvalid');
    }

    if (form.opening_date) {
      const d = new Date(form.opening_date);
      if (Number.isNaN(d.getTime())) e.opening_date = t('errors.dateInvalid');
      // A point of sale cannot have opened in the future.
      else if (d.getTime() > Date.now()) e.opening_date = t('errors.dateFuture');
    }

    for (const key of ['section_manager_phone', 'department_manager_phone', 'gds_phone'] as const) {
      const v = form[key].trim();
      if (v && !PHONE_RE.test(v)) e[key] = t('errors.phoneInvalid');
    }

    const lat = form.latitude.trim();
    const lng = form.longitude.trim();
    if (lat && (Number.isNaN(Number(lat)) || Math.abs(Number(lat)) > 90)) {
      e.latitude = t('errors.latitudeInvalid');
    }
    if (lng && (Number.isNaN(Number(lng)) || Math.abs(Number(lng)) > 180)) {
      e.longitude = t('errors.longitudeInvalid');
    }
    // A lone coordinate cannot place anything on a map.
    if (!!lat !== !!lng) {
      const msg = t('errors.coordsPair');
      if (!lat) e.latitude = msg;
      else e.longitude = msg;
    }

    if (form.google_maps_url && !/^https?:\/\//i.test(form.google_maps_url.trim())) {
      e.google_maps_url = t('errors.urlInvalid');
    }

    return e;
  };

  /** Pull lat/lng out of a pasted Google Maps link, so nobody types coordinates by hand. */
  const extractFromLink = () => {
    const coords = parseCoordsFromUrl(form.google_maps_url.trim());
    if (!coords) {
      toast.error(t('form.linkNoCoords'));
      return;
    }
    setForm((f) => ({
      ...f,
      latitude: String(coords.latitude),
      longitude: String(coords.longitude),
    }));
    setErrors((e) => ({ ...e, latitude: '', longitude: '' }));
    toast.success(t('form.linkCoordsFound'));
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error(t('form.geolocationUnsupported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          latitude: pos.coords.latitude.toFixed(7),
          longitude: pos.coords.longitude.toFixed(7),
        }));
        toast.success(t('form.locationCaptured'));
      },
      () => toast.error(t('form.locationDenied')),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      // The form is long; an error above the fold would otherwise go unseen.
      setTimeout(
        () =>
          document
            .querySelector('.form-error')
            ?.scrollIntoView({ block: 'center', behavior: 'smooth' }),
        0,
      );
      return;
    }
    setErrors({});
    setLoading(true);

    // Empty strings are omitted rather than sent: that keeps a PATCH from
    // touching fields the user never filled in.
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      region_id: form.region_id,
    };

    const optional = [
      'brand', 'channel', 'classification', 'address', 'city', 'postal_code',
      'opening_date', 'section_manager_name', 'section_manager_phone',
      'department_manager_name', 'department_manager_phone', 'gds_name',
      'gds_phone', 'google_maps_url',
    ] as const;

    for (const key of optional) {
      const v = form[key].trim();
      if (v) payload[key] = v;
    }
    if (form.latitude.trim()) payload.latitude = Number(form.latitude);
    if (form.longitude.trim()) payload.longitude = Number(form.longitude);

    await onSubmit(payload);
    setLoading(false);
  };

  const preview = {
    latitude: form.latitude.trim() ? Number(form.latitude) : null,
    longitude: form.longitude.trim() ? Number(form.longitude) : null,
  };

  const contacts = [
    { key: 'section_manager', label: t('form.contacts.sectionManager') },
    { key: 'department_manager', label: t('form.contacts.departmentManager') },
    { key: 'gds', label: t('form.contacts.gds') },
  ] as const;

  return (
    <form onSubmit={handleSubmit} className="store-form">
      {/* ── 1. General information ─────────────────────────────────────────── */}
      <fieldset className="form-section">
        <legend className="form-section-title">
          <span className="form-section-step">1</span>
          {t('form.sections.general')}
        </legend>

        <div className="form-row">
          <Input
            label={t('form.nameLabel')}
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            error={errors.name}
            placeholder={t('form.namePlaceholder')}
          />
          <Input
            label={t('form.brandLabel')}
            value={form.brand}
            onChange={(e) => set('brand', e.target.value)}
            placeholder={t('form.brandPlaceholder')}
          />
        </div>

        <div className="form-row">
          <Select
            label={t('form.channelLabel')}
            value={form.channel}
            onChange={(e) => set('channel', e.target.value)}
            options={[
              { value: 'gms', label: t('channel.gms') },
              { value: 'ls', label: t('channel.ls') },
            ]}
            placeholder={t('form.channelPlaceholder')}
          />
          <Select
            label={t('form.classificationLabel')}
            value={form.classification}
            onChange={(e) => set('classification', e.target.value)}
            options={(['A', 'B', 'C', 'D'] as const).map((c) => ({
              value: c,
              label: t(`classification.${c}`),
            }))}
            placeholder={t('form.classificationPlaceholder')}
          />
        </div>

        <div className="form-row">
          <Input
            label={t('form.openingDateLabel')}
            type="date"
            max={new Date().toISOString().slice(0, 10)}
            value={form.opening_date}
            onChange={(e) => set('opening_date', e.target.value)}
            error={errors.opening_date}
          />
          <Select
            label={t('form.regionLabel')}
            value={form.region_id}
            onChange={(e) => set('region_id', e.target.value)}
            options={regions.map((r) => ({ value: r.id, label: r.name }))}
            placeholder={t('form.regionPlaceholder')}
            error={errors.region_id}
          />
        </div>

        <Input
          label={t('form.addressLabel')}
          value={form.address}
          onChange={(e) => set('address', e.target.value)}
          error={errors.address}
          placeholder={t('form.addressPlaceholder')}
        />

        <div className="form-row">
          <Input
            label={t('form.cityLabel')}
            value={form.city}
            onChange={(e) => set('city', e.target.value)}
            placeholder={t('form.cityPlaceholder')}
          />
          <Input
            label={t('form.postalCodeLabel')}
            value={form.postal_code}
            onChange={(e) => set('postal_code', e.target.value)}
            error={errors.postal_code}
            placeholder={t('form.postalCodePlaceholder')}
          />
        </div>
      </fieldset>

      {/* ── 2. Store contacts ──────────────────────────────────────────────── */}
      <fieldset className="form-section">
        <legend className="form-section-title">
          <span className="form-section-step">2</span>
          {t('form.sections.contacts')}
        </legend>

        {contacts.map((contact) => {
          const nameKey = `${contact.key}_name` as FormKey;
          const phoneKey = `${contact.key}_phone` as FormKey;

          return (
            <div key={contact.key} className="contact-block">
              <h4 className="contact-block-title">{contact.label}</h4>
              <div className="form-row">
                <Input
                  label={t('form.contacts.name')}
                  value={form[nameKey]}
                  onChange={(e) => set(nameKey, e.target.value)}
                  placeholder={t('form.contacts.namePlaceholder')}
                />
                <Input
                  label={t('form.contacts.phone')}
                  type="tel"
                  value={form[phoneKey]}
                  onChange={(e) => set(phoneKey, e.target.value)}
                  error={errors[phoneKey]}
                  placeholder="+212 6XX XXX XXX"
                />
              </div>
            </div>
          );
        })}
      </fieldset>

      {/* ── 3. Location & geolocation ──────────────────────────────────────── */}
      <fieldset className="form-section">
        <legend className="form-section-title">
          <span className="form-section-step">3</span>
          {t('form.sections.location')}
        </legend>

        <Input
          label={t('form.mapsUrlLabel')}
          value={form.google_maps_url}
          onChange={(e) => set('google_maps_url', e.target.value)}
          error={errors.google_maps_url}
          hint={t('form.mapsUrlHint')}
          placeholder="https://www.google.com/maps/..."
        />

        <div className="geo-actions">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={extractFromLink}
            disabled={!form.google_maps_url.trim()}
          >
            {t('form.extractFromLink')}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={useMyLocation}>
            {t('form.useMyLocation')}
          </Button>
        </div>

        <div className="form-row">
          <Input
            label={t('form.latitudeLabel')}
            type="number"
            step="any"
            value={form.latitude}
            onChange={(e) => set('latitude', e.target.value)}
            error={errors.latitude}
            placeholder="33.5731"
          />
          <Input
            label={t('form.longitudeLabel')}
            type="number"
            step="any"
            value={form.longitude}
            onChange={(e) => set('longitude', e.target.value)}
            error={errors.longitude}
            placeholder="-7.5898"
          />
        </div>

        {/* Live preview — the surest way to catch a swapped lat/lng before saving. */}
        <StoreMap store={preview} height={200} label={form.name || t('form.mapPreview')} />
      </fieldset>

      <div className="form-actions">
        <Button variant="ghost" type="button" onClick={onCancel} disabled={loading}>
          {tCommon('actions.cancel')}
        </Button>
        <Button type="submit" loading={loading}>
          {initialData ? t('form.updateSubmit') : t('form.createSubmit')}
        </Button>
      </div>
    </form>
  );
}
