import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { fetchFeatureFlags, setFeatureFlag } from '../../store/slices/settingsSlice';
import PageHeader from '../../components/ui/PageHeader';
import Toggle from '../../components/ui/Toggle';

export default function SettingsPage() {
  const { t } = useTranslation('settings');
  const dispatch = useAppDispatch();
  const { flags, loading } = useAppSelector((s) => s.settings);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  useEffect(() => { dispatch(fetchFeatureFlags()); }, [dispatch]);

  const handleToggle = async (key: string, enabled: boolean) => {
    setPendingKey(key);
    const res = await dispatch(setFeatureFlag({ key, enabled }));
    setPendingKey(null);
    if (setFeatureFlag.fulfilled.match(res)) {
      toast.success(enabled ? t('toasts.enabled') : t('toasts.disabled'));
    } else {
      toast.error((res.payload as string) || t('toasts.updateFailed'));
    }
  };

  return (
    <div>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        {loading && flags.length === 0 ? (
          <p style={{ padding: 20, color: 'var(--gray-500)' }}>{t('loading')}</p>
        ) : flags.length === 0 ? (
          <p style={{ padding: 20, color: 'var(--gray-500)' }}>{t('empty')}</p>
        ) : (
          <div>
            {flags.map((flag) => (
              <div
                key={flag.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  padding: '18px 20px',
                  borderBottom: '1px solid var(--gray-100)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--gray-900)' }}>
                    {t(`flags.${flag.key}.label`, { defaultValue: flag.label })}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2, maxWidth: 560 }}>
                    {t(`flags.${flag.key}.description`, { defaultValue: flag.description })}
                  </div>
                </div>
                <Toggle
                  checked={flag.enabled}
                  disabled={pendingKey === flag.key}
                  onChange={(enabled) => handleToggle(flag.key, enabled)}
                />
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
