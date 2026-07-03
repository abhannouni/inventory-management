import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../../components/ui/Button';
import type { Store } from '../../types';

interface AssignStoresFormProps {
  stores: Store[];
  userId: string;
  onSubmit: (store_ids: string[]) => Promise<void>;
  onCancel: () => void;
}

export default function AssignStoresForm({ stores, onSubmit, onCancel }: AssignStoresFormProps) {
  const { t } = useTranslation('users');
  const { t: tCommon } = useTranslation('common');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = stores.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.address.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleSubmit = async () => {
    setLoading(true);
    await onSubmit(Array.from(selected));
    setLoading(false);
  };

  return (
    <div>
      <p style={{ color: 'var(--gray-500)', marginBottom: 16, fontSize: 13 }}>
        {t('assignStoresForm.description')}
      </p>

      <input
        className="form-input"
        placeholder={t('assignStoresForm.searchPlaceholder')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 12 }}
      />

      <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid var(--gray-200)', borderRadius: 8 }}>
        {filtered.length === 0 ? (
          <p style={{ padding: '16px', color: 'var(--gray-400)', textAlign: 'center' }}>{t('assignStoresForm.empty')}</p>
        ) : (
          filtered.map((store) => (
            <label
              key={store.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                cursor: 'pointer', borderBottom: '1px solid var(--gray-100)',
                background: selected.has(store.id) ? 'var(--primary-light)' : 'transparent',
                transition: 'background 0.1s',
              }}
            >
              <input
                type="checkbox"
                checked={selected.has(store.id)}
                onChange={() => toggle(store.id)}
                style={{ width: 16, height: 16 }}
              />
              <div>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{store.name}</div>
                <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>{store.address}</div>
              </div>
            </label>
          ))
        )}
      </div>

      <div style={{ marginTop: 8, color: 'var(--gray-500)', fontSize: 12 }}>
        {t('assignStoresForm.selectedCount', { count: selected.size })}
      </div>

      <div className="form-actions">
        <Button variant="ghost" onClick={onCancel} disabled={loading}>{tCommon('actions.cancel')}</Button>
        <Button onClick={handleSubmit} loading={loading}>{t('assignStoresForm.submit')}</Button>
      </div>
    </div>
  );
}
