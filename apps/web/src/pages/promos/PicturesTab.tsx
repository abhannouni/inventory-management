import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { fetchPromoPictureUploaders, fetchUserPictureView, clearUserPictureView } from '../../store/slices/promosSlice';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import PromoPictureCell from './PromoPictureCell';
import { formatDate, formatRole } from '../../utils/format';
import type { PromoPictureUploader } from '../../types';

interface Props {
  /** undefined = current live promo, matching the Super Admin's history filter. */
  promoId?: string;
}

export default function PicturesTab({ promoId }: Props) {
  const { t, i18n } = useTranslation('promos');
  const dispatch = useAppDispatch();
  const { pictureUploaders, userPictureView } = useAppSelector((s) => s.promos);
  const [selectedUser, setSelectedUser] = useState<PromoPictureUploader | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingList, setLoadingList] = useState(false);

  useEffect(() => {
    setSelectedUser(null);
    dispatch(clearUserPictureView());
    setLoadingList(true);
    dispatch(fetchPromoPictureUploaders(promoId)).finally(() => setLoadingList(false));
  }, [promoId, dispatch]);

  const handleOpenUser = (user: PromoPictureUploader) => {
    setSelectedUser(user);
    setLoadingDetail(true);
    dispatch(fetchUserPictureView({ userId: user.id, promoId })).finally(() => setLoadingDetail(false));
  };

  const handleBack = () => {
    setSelectedUser(null);
    dispatch(clearUserPictureView());
  };

  if (selectedUser) {
    return (
      <div>
        <div style={{ marginBottom: 16 }}>
          <Button variant="ghost" size="sm" onClick={handleBack}>{t('pictures.detail.back')}</Button>
        </div>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
          {t('pictures.detail.title', { name: selectedUser.full_name })}
        </h3>
        {loadingDetail || !userPictureView ? (
          <Spinner center size="lg" />
        ) : (
          <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <DataTable
              columns={[
                { key: 'product', header: t('table.product'), render: (item) => item.product?.name || '—' },
                { key: 'contenance', header: t('table.contenance'), render: (item) => item.contenance },
                { key: 'original_price', header: t('table.originalPrice'), render: (item) => Number(item.original_price).toFixed(2) },
                { key: 'promo_price', header: t('table.promoPrice'), render: (item) => Number(item.promo_price).toFixed(2) },
                { key: 'picture', header: t('table.picture'), render: (item) => <PromoPictureCell item={item} readOnly /> },
              ]}
              data={userPictureView.items}
              keyExtractor={(item) => item.id}
              emptyMessage={t('table.empty')}
            />
          </motion.div>
        )}
      </div>
    );
  }

  return (
    <div>
      <p style={{ color: 'var(--gray-500)', fontSize: 13, marginBottom: 16 }}>{t('pictures.subtitle')}</p>
      <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <DataTable
          columns={[
            { key: 'user', header: t('pictures.table.user'), render: (u: PromoPictureUploader) => <span style={{ fontWeight: 500 }}>{u.full_name}</span> },
            { key: 'role', header: t('pictures.table.role'), render: (u: PromoPictureUploader) => <Badge variant="gray">{formatRole(u.role)}</Badge> },
            {
              key: 'progress',
              header: t('pictures.table.progress'),
              render: (u: PromoPictureUploader) => `${u.uploaded_count} / ${pictureUploaders?.total_items ?? 0}`,
            },
            { key: 'lastUpload', header: t('pictures.table.lastUpload'), render: (u: PromoPictureUploader) => formatDate(u.last_upload_at, i18n.language) },
            {
              key: 'actions',
              header: '',
              render: (u: PromoPictureUploader) => (
                <div className="table-actions">
                  <Button variant="outline" size="sm" onClick={() => handleOpenUser(u)}>{t('pictures.table.view')}</Button>
                </div>
              ),
            },
          ]}
          data={pictureUploaders?.users ?? []}
          loading={loadingList}
          keyExtractor={(u) => u.id}
          emptyMessage={t('pictures.table.empty')}
        />
      </motion.div>
    </div>
  );
}
