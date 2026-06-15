import { useState } from 'react';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import type { Region, User } from '../../types';

interface UserFormProps {
  regions: Region[];
  initialData?: User;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

const roleOptions = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'merchandiser', label: 'Merchandiser' },
];

export default function UserForm({ regions, initialData, onSubmit, onCancel }: UserFormProps) {
  const isEdit = !!initialData;

  const [form, setForm] = useState({
    full_name: initialData?.full_name || '',
    email: initialData?.email || '',
    password: '',
    role: initialData?.role || 'merchandiser',
    region_id: initialData?.region_id || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.full_name.trim()) errs.full_name = 'Name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    if (!isEdit && !form.password) errs.password = 'Password is required';
    if (!isEdit && form.password.length < 6) errs.password = 'Password must be at least 6 characters';
    if (!form.role) errs.role = 'Role is required';
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    const payload: any = { ...form };
    if (!payload.region_id) delete payload.region_id;
    if (isEdit && !payload.password) delete payload.password;
    await onSubmit(payload);
    setLoading(false);
  };

  const regionOptions = regions.map((r) => ({ value: r.id, label: r.name }));

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row">
        <Input
          label="Full Name"
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          error={errors.full_name}
          placeholder="John Doe"
        />
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          error={errors.email}
          placeholder="john@example.com"
        />
      </div>

      <div className="form-row">
        <Select
          label="Role"
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          options={roleOptions}
          error={errors.role}
        />
        <Select
          label="Region (optional)"
          value={form.region_id}
          onChange={(e) => setForm({ ...form, region_id: e.target.value })}
          options={regionOptions}
          placeholder="No region"
        />
      </div>

      <Input
        label={isEdit ? 'New Password (leave blank to keep)' : 'Password'}
        type="password"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
        error={errors.password}
        placeholder="••••••••"
      />

      <div className="form-actions">
        <Button variant="ghost" type="button" onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button type="submit" loading={loading}>{isEdit ? 'Update User' : 'Create User'}</Button>
      </div>
    </form>
  );
}
