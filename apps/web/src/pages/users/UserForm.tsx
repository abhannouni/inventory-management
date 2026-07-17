import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import type { Region, RoleRecord, User } from '../../types';

interface UserFormProps {
  regions: Region[];
  roles: RoleRecord[];
  supervisors: User[];
  initialData?: User;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

/** The API rejects anything shorter — keep the two in step. */
const MIN_PASSWORD_LENGTH = 8;

export default function UserForm({
  regions,
  roles,
  supervisors,
  initialData,
  onSubmit,
  onCancel,
}: UserFormProps) {
  const { t } = useTranslation('users');
  const { t: tCommon } = useTranslation('common');
  const isEdit = !!initialData;

  // One selector over every role — built-in and custom alike — keyed by id.
  const roleOptions = roles.map((r) => ({
    value: r.id,
    label: r.is_system ? tCommon(`roles.${r.name}`) : r.label,
  }));

  const initialRoleId =
    initialData?.role_id ?? roles.find((r) => r.name === initialData?.role)?.id ?? '';

  const [form, setForm] = useState({
    full_name: initialData?.full_name || '',
    email: initialData?.email || '',
    password: '',
    role_id: initialRoleId,
    region_id: initialData?.region_id || '',
    supervisor_id: initialData?.supervisor_id || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.full_name.trim()) errs.full_name = t('errors.nameRequired');
    if (!form.email.trim()) errs.email = t('errors.emailRequired');
    if (!isEdit && !form.password) errs.password = t('errors.passwordRequired');
    if (form.password && form.password.length < MIN_PASSWORD_LENGTH) {
      errs.password = t('errors.passwordMinLength', { count: MIN_PASSWORD_LENGTH });
    }
    if (!form.role_id) errs.role_id = t('errors.roleRequired');
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);

    const selected = roles.find((r) => r.id === form.role_id);
    const isMerchandiserRole = selected ? (!selected.is_system || selected.name === 'merchandiser') : false;

    const payload: any = {
      full_name: form.full_name,
      email: form.email,
      role_id: form.role_id,
      // `role` is the legacy enum column and is still required on create. For a
      // custom role the server re-resolves it to the least-privileged value.
      role: selected?.is_system ? selected.name : 'merchandiser',
      region_id: form.region_id || undefined,
      supervisor_id: isMerchandiserRole && form.supervisor_id ? form.supervisor_id : (isEdit ? null : undefined),
    };
    if (!payload.region_id) delete payload.region_id;
    if (payload.supervisor_id === undefined) delete payload.supervisor_id;
    if (form.password) payload.password = form.password;

    await onSubmit(payload);
    setLoading(false);
  };

  const regionOptions = regions.map((r) => ({ value: r.id, label: r.name }));
  const selectedRole = roles.find((r) => r.id === form.role_id);
  const showSupervisorField = selectedRole ? (!selectedRole.is_system || selectedRole.name === 'merchandiser') : false;
  const supervisorOptions = supervisors.map((s) => ({ value: s.id, label: s.full_name }));

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
          value={form.role_id}
          onChange={(e) => setForm({ ...form, role_id: e.target.value })}
          options={roleOptions}
          placeholder={t('fields.rolePlaceholder')}
          error={errors.role_id}
        />
        <Select
          label={t('fields.region')}
          value={form.region_id}
          onChange={(e) => setForm({ ...form, region_id: e.target.value })}
          options={regionOptions}
          placeholder={t('fields.regionPlaceholder')}
        />
      </div>

      {showSupervisorField && (
        <div className="form-row">
          <Select
            label={t('fields.supervisor')}
            value={form.supervisor_id}
            onChange={(e) => setForm({ ...form, supervisor_id: e.target.value })}
            options={supervisorOptions}
            placeholder={t('fields.supervisorPlaceholder')}
          />
        </div>
      )}

      <Input
        label={isEdit ? t('fields.newPassword') : t('fields.password')}
        type="password"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
        error={errors.password}
        hint={isEdit ? t('fields.passwordHint') : undefined}
        placeholder="••••••••"
      />

      <div className="form-actions">
        <Button variant="ghost" type="button" onClick={onCancel} disabled={loading}>
          {tCommon('actions.cancel')}
        </Button>
        <Button type="submit" loading={loading}>
          {isEdit ? t('updateUser') : t('createUser')}
        </Button>
      </div>
    </form>
  );
}
