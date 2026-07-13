import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import type { RoleRecord } from '../../types';

interface RoleFormProps {
  initialData?: RoleRecord;
  onSubmit: (data: { name?: string; label: string; description?: string }) => Promise<void>;
  onCancel: () => void;
}

/** Derive a valid machine name from the label: "Regional Auditor" → "regional_auditor". */
const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50);

export default function RoleForm({ initialData, onSubmit, onCancel }: RoleFormProps) {
  const { t } = useTranslation('roles');
  const { t: tCommon } = useTranslation('common');
  const isEdit = !!initialData;

  const [form, setForm] = useState({
    label: initialData?.label ?? '',
    name: initialData?.name ?? '',
    description: initialData?.description ?? '',
    // Once the user edits the machine name by hand, stop overwriting it.
    nameTouched: isEdit,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleLabelChange = (label: string) => {
    setForm((f) => ({
      ...f,
      label,
      name: f.nameTouched ? f.name : slugify(label),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errs: Record<string, string> = {};
    if (!form.label.trim()) errs.label = t('errors.labelRequired');
    if (!isEdit) {
      if (!form.name.trim()) errs.name = t('errors.nameRequired');
      else if (!/^[a-z][a-z0-9_]*$/.test(form.name)) errs.name = t('errors.nameFormat');
    }
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setErrors({});
    setLoading(true);
    await onSubmit(
      isEdit
        ? { label: form.label, description: form.description }
        : { name: form.name, label: form.label, description: form.description },
    );
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input
        label={t('fields.label')}
        value={form.label}
        onChange={(e) => handleLabelChange(e.target.value)}
        error={errors.label}
        placeholder={t('fields.labelPlaceholder')}
      />

      <Input
        label={t('fields.name')}
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value, nameTouched: true })}
        error={errors.name}
        disabled={isEdit}
        hint={isEdit ? t('fields.nameImmutable') : t('fields.nameHint')}
        placeholder="regional_auditor"
      />

      <Input
        label={t('fields.description')}
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        placeholder={t('fields.descriptionPlaceholder')}
      />

      <div className="form-actions">
        <Button variant="ghost" type="button" onClick={onCancel} disabled={loading}>
          {tCommon('actions.cancel')}
        </Button>
        <Button type="submit" loading={loading}>
          {isEdit ? t('updateRole') : t('createRole')}
        </Button>
      </div>
    </form>
  );
}
