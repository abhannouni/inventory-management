import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { usePermissions } from '../../hooks/usePermissions';
import { fetchStore, updateStore } from '../../store/slices/storesSlice';
import { fetchRegions } from '../../store/slices/regionsSlice';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import StoreForm from './StoreForm';
import StoreMap from './StoreMap';
import { formatDateOnly } from '../../utils/format';
import type { Store } from '../../types';

/** A labelled value. Renders an em dash rather than a blank when unset. */
function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="pos-field">
      <span className="pos-field-label">{label}</span>
      <span className={`pos-field-value ${value ? '' : 'is-empty'}`}>{value || '—'}</span>
    </div>
  );
}

/** A contact card: name plus a phone number that is tappable on a phone. */
function ContactCard({
  role,
  name,
  phone,
  emptyLabel,
}: {
  role: string;
  name: string | null;
  phone: string | null;
  emptyLabel: string;
}) {
  return (
    <div className="pos-contact">
      <span className="pos-contact-role">{role}</span>

      {name || phone ? (
        <>
          <span className="pos-contact-name">{name || '—'}</span>
          {phone ? (
            // tel: turns the number into one tap for a merchandiser in the field.
            <a className="pos-contact-phone" href={`tel:${phone.replace(/[^\d+]/g, '')}`}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0122 16.92z" />
              </svg>
              {phone}
            </a>
          ) : (
            <span className="pos-contact-phone is-empty">—</span>
          )}
        </>
      ) : (
        <span className="pos-contact-empty">{emptyLabel}</span>
      )}
    </div>
  );
}

export default function StoreDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation('stores');
  const { t: tCommon } = useTranslation('common');
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const p = usePermissions();

  const { selected: store, loading } = useAppSelector((s) => s.stores);
  const { items: regions } = useAppSelector((s) => s.regions);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (id) dispatch(fetchStore(id));
    dispatch(fetchRegions());
  }, [dispatch, id]);

  const handleUpdate = async (data: Record<string, unknown>) => {
    if (!store) return;
    const res = await dispatch(updateStore({ id: store.id, payload: data }));
    if (updateStore.fulfilled.match(res)) {
      toast.success(t('toasts.updateSuccess'));
      setEditOpen(false);
    } else {
      toast.error((res.payload as string) || t('toasts.updateError'));
    }
  };

  if (loading && !store) return <Spinner center size="lg" />;

  if (!store) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">{t('detail.notFound')}</div>
        <Button variant="ghost" onClick={() => navigate('/stores')}>
          {tCommon('actions.back')}
        </Button>
      </div>
    );
  }

  const s: Store = store;

  return (
    <div>
      <PageHeader
        title={s.name}
        subtitle={[s.brand, s.city, s.region?.name].filter(Boolean).join(' · ')}
        actions={
          p.canManageStores ? (
            <Button onClick={() => setEditOpen(true)}>{t('detail.edit')}</Button>
          ) : undefined
        }
      />

      <motion.div
        className="pos-detail"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="pos-badges">
          {s.channel && <Badge variant="primary">{t(`channel.${s.channel}`)}</Badge>}
          {s.classification && (
            <Badge variant="warning">
              {t('detail.classShort', { value: s.classification })}
            </Badge>
          )}
          <Badge variant={s.is_active ? 'success' : 'gray'} dot>
            {s.is_active ? tCommon('status.active') : tCommon('status.inactive')}
          </Badge>
          {s.visible_to_gm && <Badge variant="gray">{t('detail.visibleToGm')}</Badge>}
        </div>

        {/* ── 1. General information ───────────────────────────────────────── */}
        <section className="pos-card">
          <h3 className="pos-card-title">{t('form.sections.general')}</h3>
          <div className="pos-grid">
            <Field label={t('form.nameLabel')} value={s.name} />
            <Field label={t('form.brandLabel')} value={s.brand} />
            <Field
              label={t('form.channelLabel')}
              value={s.channel ? t(`channel.${s.channel}`) : null}
            />
            <Field
              label={t('form.classificationLabel')}
              value={s.classification ? t(`classification.${s.classification}`) : null}
            />
            <Field label={t('form.addressLabel')} value={s.address} />
            <Field label={t('form.cityLabel')} value={s.city} />
            <Field label={t('form.regionLabel')} value={s.region?.name} />
            <Field label={t('form.postalCodeLabel')} value={s.postal_code} />
            <Field
              label={t('form.openingDateLabel')}
              value={s.opening_date ? formatDateOnly(s.opening_date, i18n.language) : null}
            />
          </div>
        </section>

        {/* ── 2. Store contacts ────────────────────────────────────────────── */}
        <section className="pos-card">
          <h3 className="pos-card-title">{t('form.sections.contacts')}</h3>
          <div className="pos-contacts">
            <ContactCard
              role={t('form.contacts.sectionManager')}
              name={s.section_manager_name}
              phone={s.section_manager_phone}
              emptyLabel={t('detail.noContact')}
            />
            <ContactCard
              role={t('form.contacts.departmentManager')}
              name={s.department_manager_name}
              phone={s.department_manager_phone}
              emptyLabel={t('detail.noContact')}
            />
            <ContactCard
              role={t('form.contacts.gds')}
              name={s.gds_name}
              phone={s.gds_phone}
              emptyLabel={t('detail.noContact')}
            />
          </div>
        </section>

        {/* ── 3. Location & geolocation ────────────────────────────────────── */}
        <section className="pos-card">
          <h3 className="pos-card-title">{t('form.sections.location')}</h3>
          <div className="pos-grid pos-grid-geo">
            <Field
              label={t('form.latitudeLabel')}
              value={s.latitude != null ? Number(s.latitude).toFixed(7) : null}
            />
            <Field
              label={t('form.longitudeLabel')}
              value={s.longitude != null ? Number(s.longitude).toFixed(7) : null}
            />
          </div>
          <StoreMap store={s} label={s.name} height={300} />
        </section>
      </motion.div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={t('detail.editTitle')} size="lg">
        <StoreForm
          regions={regions}
          initialData={s}
          onSubmit={handleUpdate}
          onCancel={() => setEditOpen(false)}
        />
      </Modal>
    </div>
  );
}
