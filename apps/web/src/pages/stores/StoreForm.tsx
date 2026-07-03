import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import type { Region, Store } from '../../types';

interface StoreFormProps {
  regions: Region[];
  initialData?: Store;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

export default function StoreForm({ regions, initialData, onSubmit, onCancel }: StoreFormProps) {
  const { t } = useTranslation('stores');
  const { t: tCommon } = useTranslation('common');
  const [form, setForm] = useState({
    name:      initialData?.name      || '',
    address:   initialData?.address   || '',
    lat:       initialData?.latitude  != null ? String(initialData.latitude)  : '',
    lng:       initialData?.longitude != null ? String(initialData.longitude) : '',
    region_id: initialData?.region_id || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim())    errs.name      = t('errors.nameRequired');
    if (!form.address.trim()) errs.address   = t('errors.addressRequired');
    if (!form.region_id)      errs.region_id = t('errors.regionRequired');
    if (form.lat && (isNaN(Number(form.lat)) || Number(form.lat) < -90  || Number(form.lat) > 90))  errs.lat = t('errors.latitudeInvalid');
    if (form.lng && (isNaN(Number(form.lng)) || Number(form.lng) < -180 || Number(form.lng) > 180)) errs.lng = t('errors.longitudeInvalid');
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    await onSubmit({
      name:      form.name.trim(),
      address:   form.address.trim(),
      latitude:  form.lat  ? Number(form.lat)  : undefined,
      longitude: form.lng  ? Number(form.lng)  : undefined,
      region_id: form.region_id,
    });
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row">
        <Input
          label={t('form.nameLabel')}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          error={errors.name}
          placeholder={t('form.namePlaceholder')}
        />
        <Select
          label={t('form.regionLabel')}
          value={form.region_id}
          onChange={(e) => setForm({ ...form, region_id: e.target.value })}
          options={regions.map((r) => ({ value: r.id, label: r.name }))}
          placeholder={t('form.regionPlaceholder')}
          error={errors.region_id}
        />
      </div>

      <Input
        label={t('form.addressLabel')}
        value={form.address}
        onChange={(e) => setForm({ ...form, address: e.target.value })}
        error={errors.address}
        placeholder={t('form.addressPlaceholder')}
      />

      <div className="form-row">
        <Input
          label={t('form.latitudeLabel')}
          type="number"
          step="any"
          value={form.lat}
          onChange={(e) => setForm({ ...form, lat: e.target.value })}
          error={errors.lat}
          placeholder={t('form.latitudePlaceholder')}
        />
        <Input
          label={t('form.longitudeLabel')}
          type="number"
          step="any"
          value={form.lng}
          onChange={(e) => setForm({ ...form, lng: e.target.value })}
          error={errors.lng}
          placeholder={t('form.longitudePlaceholder')}
        />
      </div>

      <p style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: -8 }}>
        {t('form.gpsHint')}
      </p>

      <div className="form-actions">
        <Button variant="ghost" type="button" onClick={onCancel} disabled={loading}>{tCommon('actions.cancel')}</Button>
        <Button type="submit" loading={loading}>{initialData ? t('form.updateSubmit') : t('form.createSubmit')}</Button>
      </div>
    </form>
  );
}
