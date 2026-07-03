import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import Button from './Button';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
  loading?: boolean;
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  loading = false,
}: ConfirmDialogProps) {
  const { t } = useTranslation('common');
  return (
    <Modal open={open} onClose={onClose} title={title || t('confirmDialog.title')} size="sm">
      <p style={{ color: 'var(--gray-600)', marginBottom: '24px' }}>{message || t('confirmDialog.message')}</p>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={onClose} disabled={loading}>{t('actions.cancel')}</Button>
        <Button variant="danger" onClick={onConfirm} loading={loading}>{confirmLabel || t('confirmDialog.delete')}</Button>
      </div>
    </Modal>
  );
}
