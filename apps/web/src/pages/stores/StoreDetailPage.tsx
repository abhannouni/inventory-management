import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { usePermissions } from '../../hooks/usePermissions';
import { fetchStore, updateStore } from '../../store/slices/storesSlice';
import { fetchRegions } from '../../store/slices/regionsSlice';
import { fetchProducts } from '../../store/slices/productsSlice';
import { bulkAssignProductStores } from '../../store/slices/productStoresSlice';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import StoreForm from './StoreForm';
import StoreMap from './StoreMap';
import StoreProductsPicker from './StoreProductsPicker';
import type { ProductAssignmentValue } from './StoreProductsPicker';
import PosOverviewSections from './PosOverviewSections';
import { storesApi } from '../../api/stores.api';
import { formatDateOnly } from '../../utils/format';
import type { Store, StoreOverview } from '../../types';

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
  const { items: products } = useAppSelector((s) => s.products);
  const [editOpen, setEditOpen] = useState(false);
  const [addProductsOpen, setAddProductsOpen] = useState(false);
  const [addProductsValue, setAddProductsValue] = useState<ProductAssignmentValue[]>([]);
  const [savingProducts, setSavingProducts] = useState(false);

  // The rich aggregate (team, visits, stock, photos…) is loaded alongside the
  // base store, in local state rather than Redux — nothing else needs it. Tagged
  // with the id it belongs to so a stale result for the previous POS is ignored.
  const [fetched, setFetched] = useState<{ id: string; data: StoreOverview | null } | null>(null);

  useEffect(() => {
    if (id) dispatch(fetchStore(id));
    dispatch(fetchRegions());
    dispatch(fetchProducts());
  }, [dispatch, id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    storesApi
      .overview(id)
      .then((data) => !cancelled && setFetched({ id, data }))
      // A 403/404 here just means the overview isn't available — the base store
      // view still renders; don't blow up the page.
      .catch(() => !cancelled && setFetched({ id, data: null }));
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Only surface the aggregate once it matches the POS currently on screen.
  const overview = fetched && fetched.id === id ? fetched.data : null;
  const overviewLoading = !fetched || fetched.id !== id;

  const reloadOverview = () => {
    if (id) storesApi.overview(id).then((data) => setFetched({ id, data })).catch(() => {});
  };

  const handleUpdate = async (data: Record<string, unknown>) => {
    if (!store) return;
    const res = await dispatch(updateStore({ id: store.id, payload: data }));
    if (updateStore.fulfilled.match(res)) {
      const productAssignments = data.product_assignments as { product_id: string; expected_qty: number }[] | undefined;
      const assignRes = await dispatch(
        bulkAssignProductStores({ store_id: store.id, items: productAssignments ?? [] }),
      );
      if (bulkAssignProductStores.rejected.match(assignRes)) {
        toast.error((assignRes.payload as string) || t('toasts.assignProductsError'));
      }
      toast.success(t('toasts.updateSuccess'));
      setEditOpen(false);
      reloadOverview();
    } else {
      toast.error((res.payload as string) || t('toasts.updateError'));
    }
  };

  const initialProductAssignments: ProductAssignmentValue[] = useMemo(
    () =>
      (overview?.product_availability ?? []).map((row) => ({
        product_id: row.product.id,
        expected_qty: row.expected_qty,
      })),
    [overview],
  );

  const openAddProducts = () => {
    setAddProductsValue(initialProductAssignments);
    setAddProductsOpen(true);
  };

  const handleSaveProducts = async () => {
    if (!store) return;
    setSavingProducts(true);
    const res = await dispatch(bulkAssignProductStores({ store_id: store.id, items: addProductsValue }));
    setSavingProducts(false);
    if (bulkAssignProductStores.fulfilled.match(res)) {
      toast.success(t('toasts.assignProductsSuccess'));
      setAddProductsOpen(false);
      reloadOverview();
    } else {
      toast.error((res.payload as string) || t('toasts.assignProductsError'));
    }
  };

  if (loading && !store) return <Spinner center size="lg" />;

  if (!store) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">{t('detail.notFound')}</div>
        <Button variant="ghost" onClick={() => navigate('/pos')}>
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
          p.can('inventory.create') || p.canManageStores ? (
            <div style={{ display: 'flex', gap: 8 }}>
              {p.can('inventory.create') && (
                <Button variant="outline" onClick={openAddProducts}>{t('detail.addProducts')}</Button>
              )}
              {p.canManageStores && (
                <Button onClick={() => setEditOpen(true)}>{t('detail.edit')}</Button>
              )}
            </div>
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
          {overview && overview.stock_summary.expected_products === 0 && (
            <Badge variant="gray" dot>{t('noProductsTag')}</Badge>
          )}
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

        {/* ── Operational sections — team, stock, visits, photos, … ────────── */}
        <PosOverviewSections overview={overview} loading={overviewLoading} />
      </motion.div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={t('detail.editTitle')} size="lg">
        <StoreForm
          regions={regions}
          products={products}
          initialData={s}
          initialProductAssignments={initialProductAssignments}
          onSubmit={handleUpdate}
          onCancel={() => setEditOpen(false)}
        />
      </Modal>

      <Modal
        open={addProductsOpen}
        onClose={() => setAddProductsOpen(false)}
        title={t('detail.addProductsTitle', { name: s.name })}
        size="lg"
      >
        <StoreProductsPicker products={products} value={addProductsValue} onChange={setAddProductsValue} />
        <div className="form-actions">
          <Button variant="ghost" type="button" onClick={() => setAddProductsOpen(false)} disabled={savingProducts}>
            {tCommon('actions.cancel')}
          </Button>
          <Button type="button" onClick={handleSaveProducts} loading={savingProducts}>
            {tCommon('actions.save')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
