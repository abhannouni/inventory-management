import { useState } from 'react';
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
    if (!form.name.trim())    errs.name      = 'Name is required';
    if (!form.address.trim()) errs.address   = 'Address is required';
    if (!form.region_id)      errs.region_id = 'Region is required';
    if (form.lat && (isNaN(Number(form.lat)) || Number(form.lat) < -90  || Number(form.lat) > 90))  errs.lat = 'Invalid latitude (-90 to 90)';
    if (form.lng && (isNaN(Number(form.lng)) || Number(form.lng) < -180 || Number(form.lng) > 180)) errs.lng = 'Invalid longitude (-180 to 180)';
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
          label="Store Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          error={errors.name}
          placeholder="e.g. Downtown Branch"
        />
        <Select
          label="Region"
          value={form.region_id}
          onChange={(e) => setForm({ ...form, region_id: e.target.value })}
          options={regions.map((r) => ({ value: r.id, label: r.name }))}
          placeholder="Select region"
          error={errors.region_id}
        />
      </div>

      <Input
        label="Address"
        value={form.address}
        onChange={(e) => setForm({ ...form, address: e.target.value })}
        error={errors.address}
        placeholder="e.g. 123 Main St, City"
      />

      <div className="form-row">
        <Input
          label="Latitude"
          type="number"
          step="any"
          value={form.lat}
          onChange={(e) => setForm({ ...form, lat: e.target.value })}
          error={errors.lat}
          placeholder="e.g. 34.0522"
        />
        <Input
          label="Longitude"
          type="number"
          step="any"
          value={form.lng}
          onChange={(e) => setForm({ ...form, lng: e.target.value })}
          error={errors.lng}
          placeholder="e.g. -118.2437"
        />
      </div>

      <p style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: -8 }}>
        GPS coordinates are optional and used for location tracking.
      </p>

      <div className="form-actions">
        <Button variant="ghost" type="button" onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button type="submit" loading={loading}>{initialData ? 'Update Store' : 'Create Store'}</Button>
      </div>
    </form>
  );
}
