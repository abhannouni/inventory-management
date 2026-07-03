import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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

export default function UserForm({ regions, initialData, onSubmit, onCancel }: UserFormProps) {
  const { t } = useTranslation('users');
  const { t: tCommon } = useTranslation('common');
  const isEdit = !!initialData;

  const roleOptions = [
    { value: 'super_admin', label: tCommon('roles.super_admin') },
    { value: 'admin', label: tCommon('roles.admin') },
    { value: 'supervisor', label: tCommon('roles.supervisor') },
    { value: 'merchandiser', label: tCommon('roles.merchandiser') },
  ];

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
    if (!form.full_name.trim()) errs.full_name = t('errors.nameRequired');
    if (!form.email.trim()) errs.email = t('errors.emailRequired');
    if (!isEdit && !form.password) errs.password = t('errors.passwordRequired');
    if (!isEdit && form.password.length < 6) errs.password = t('errors.passwordMinLength');
    if (!form.role) errs.role = t('errors.roleRequired');
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
          label={t('fields.fullName')}
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          error={errors.full_name}
          placeholder={t('fields.fullNamePlaceholder')}
        />
        <Input
          label={t('fields.email')}
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          error={errors.email}
          placeholder={t('fields.emailPlaceholder')}
        />
      </div>

      <div className="form-row">
        <Select
          label={t('fields.role')}
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value as import('../../types').Role })}
          options={roleOptions}
          error={errors.role}
        />
        <Select
          label={t('fields.region')}
          value={form.region_id}
          onChange={(e) => setForm({ ...form, region_id: e.target.value })}
          options={regionOptions}
          placeholder={t('fields.regionPlaceholder')}
        />
      </div>

      <Input
        label={isEdit ? t('fields.newPassword') : t('fields.password')}
        type="password"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
        error={errors.password}
        placeholder="••••••••"
      />

      <div className="form-actions">
        <Button variant="ghost" type="button" onClick={onCancel} disabled={loading}>{tCommon('actions.cancel')}</Button>
        <Button type="submit" loading={loading}>{isEdit ? t('updateUser') : t('createUser')}</Button>
      </div>
    </form>
  );
}
