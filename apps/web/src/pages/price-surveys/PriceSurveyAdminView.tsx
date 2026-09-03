import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { fetchUsers, fetchUser } from '../../store/slices/usersSlice';
import { fetchProducts } from '../../store/slices/productsSlice';
import { fetchDraft, fetchSubmissions, fetchSubmission, clearViewed } from '../../store/slices/priceSurveysSlice';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import DataTable from '../../components/ui/DataTable';
import SearchInput from '../../components/ui/SearchInput';
import Spinner from '../../components/ui/Spinner';
import Input from '../../components/ui/Input';
import SlideTabs from './SlideTabs';
import type { Slide } from './SlideTabs';
import PriceSurveyGrid from './PriceSurveyGrid';
import AssignProductsModal from './AssignProductsModal';
import { itemToFormValues } from './itemFormValues';
import { formatDate, formatRole } from '../../utils/format';
import type { User, PriceSurveySubmission } from '../../types';

export default function PriceSurveyAdminView() {
  const { t, i18n } = useTranslation('priceSurveys');
  const dispatch = useAppDispatch();

  const { items: users, loading: usersLoading, selected: fullUser } = useAppSelector((s) => s.users);
  const { draft, viewed, submissions, loading: draftLoading } = useAppSelector((s) => s.priceSurveys);

  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [activeSlide, setActiveSlide] = useState<string>('');
  const [assignOpen, setAssignOpen] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    dispatch(fetchUsers({ search: search || undefined, limit: 100 }));
  }, [dispatch, search]);

  // Only supervisors and merchandisers fill in a price survey — the picker
  // shouldn't offer admins/GM/other super admins as fillable targets.
  const fillingUsers = useMemo(
    () => users.filter((u) => u.role === 'supervisor' || u.role === 'merchandiser'),
    [users],
  );

  useEffect(() => {
    dispatch(fetchProducts());
  }, [dispatch]);

  useEffect(() => {
    if (!selectedUser) return;
    dispatch(fetchUser(selectedUser.id));
  }, [selectedUser, dispatch]);

  useEffect(() => {
    if (!selectedUser || !selectedStoreId) return;
    dispatch(fetchDraft({ storeId: selectedStoreId, userId: selectedUser.id }));
    dispatch(fetchSubmissions({ user_id: selectedUser.id, store_id: selectedStoreId }));
  }, [selectedUser, selectedStoreId, dispatch]);

  const selectedStore = fullUser?.stores?.find((s) => s.id === selectedStoreId);

  const itemValues = useMemo(() => {
    const map: Record<string, ReturnType<typeof itemToFormValues>> = {};
    for (const item of viewed?.items ?? []) map[item.id] = itemToFormValues(item);
    return map;
  }, [viewed]);

  const slides: Slide[] = useMemo(() => {
    if (!viewed) return [];
    const categories = Array.from(new Set(viewed.items.map((i) => i.product?.category).filter(Boolean))) as string[];
    categories.sort((a, b) => a.localeCompare(b));
    return categories.map((c) => ({ key: c, label: c }));
  }, [viewed]);

  useEffect(() => {
    if (!slides.length) return;
    if (!slides.find((s) => s.key === activeSlide)) setActiveSlide(slides[0].key);
  }, [slides, activeSlide]);

  const itemsForActiveSlide = useMemo(() => {
    if (!viewed || !activeSlide) return [];
    return viewed.items.filter((i) => i.product?.category === activeSlide);
  }, [viewed, activeSlide]);

  const isViewingHistory = !!viewed && !!draft && viewed.id !== draft.id;

  const handleApplyFilter = () => {
    if (!selectedUser || !selectedStoreId) return;
    dispatch(fetchSubmissions({ user_id: selectedUser.id, store_id: selectedStoreId, from: from || undefined, to: to || undefined }));
  };

  // ── Step 3: management panel ──────────────────────────────────────────────
  if (selectedUser && selectedStoreId) {
    return (
      <div>
        <PageHeader
          title={t('admin.manage.title', { user: selectedUser.full_name, store: selectedStore?.name ?? '' })}
          actions={
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="ghost" onClick={() => setSelectedStoreId(null)}>{t('admin.pickStore.back')}</Button>
              <Button onClick={() => setAssignOpen(true)}>{t('admin.assignProducts.open')}</Button>
            </div>
          }
        />

        <div className="filter-bar" style={{ alignItems: 'flex-end', gap: 12 }}>
          <Input label={t('admin.history.from')} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label={t('admin.history.to')} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <Button variant="outline" size="sm" onClick={handleApplyFilter}>{t('admin.history.apply')}</Button>
        </div>

        <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} style={{ marginBottom: 16 }}>
          <DataTable
            columns={[
              {
                key: 'submitted_at',
                header: t('admin.history.table.date'),
                render: (sub: PriceSurveySubmission) => (sub.submitted_at ? formatDate(sub.submitted_at, i18n.language) : '—'),
              },
              {
                key: 'items',
                header: t('admin.history.table.itemCount'),
                render: (sub: PriceSurveySubmission) => sub._count?.items ?? sub.items?.length ?? 0,
              },
              {
                key: 'actions',
                header: '',
                render: (sub: PriceSurveySubmission) => (
                  <Button variant="outline" size="sm" onClick={() => dispatch(fetchSubmission(sub.id))}>
                    {t('admin.history.table.view')}
                  </Button>
                ),
              },
            ]}
            data={submissions}
            keyExtractor={(sub) => sub.id}
            emptyMessage={t('admin.history.table.empty')}
          />
        </motion.div>

        {isViewingHistory && (
          <div className="filter-bar" style={{ gap: 12 }}>
            <Badge variant="warning">{t('admin.history.viewingOld')}</Badge>
            <Button variant="ghost" size="sm" onClick={() => dispatch(clearViewed())}>
              {t('admin.history.backToCurrent')}
            </Button>
          </div>
        )}

        {draftLoading || !viewed ? (
          <Spinner center size="lg" />
        ) : !viewed.items.length ? (
          <div className="card">
            <p style={{ color: 'var(--gray-500)' }}>{t('emptyState.admin')}</p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <SlideTabs slides={slides} active={activeSlide} onChange={setActiveSlide} />
            </div>
            <div className="card">
              <PriceSurveyGrid items={itemsForActiveSlide} values={itemValues} onFieldChange={() => {}} editable={false} />
            </div>
          </>
        )}

        <AssignProductsModal
          open={assignOpen}
          userId={selectedUser.id}
          storeId={selectedStoreId}
          userName={selectedUser.full_name}
          onClose={() => setAssignOpen(false)}
          onSaved={() => dispatch(fetchDraft({ storeId: selectedStoreId, userId: selectedUser.id }))}
        />
      </div>
    );
  }

  // ── Step 2: pick a PDV ─────────────────────────────────────────────────────
  if (selectedUser) {
    return (
      <div>
        <PageHeader
          title={t('admin.pickStore.title', { name: selectedUser.full_name })}
          actions={<Button variant="ghost" onClick={() => setSelectedUser(null)}>{t('admin.pickUser.back')}</Button>}
        />
        {!fullUser || fullUser.id !== selectedUser.id ? (
          <Spinner center size="lg" />
        ) : !fullUser.stores?.length ? (
          <div className="card">
            <p style={{ color: 'var(--gray-500)' }}>{t('admin.pickStore.empty')}</p>
          </div>
        ) : (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {fullUser.stores.map((store) => (
              <button
                key={store.id}
                type="button"
                className="tab-item"
                style={{ justifyContent: 'space-between', display: 'flex', textAlign: 'left', padding: '12px 16px', border: '1px solid var(--gray-200)', borderRadius: 8 }}
                onClick={() => setSelectedStoreId(store.id)}
              >
                <span>
                  <strong>{store.name}</strong>
                  {store.city && <span style={{ color: 'var(--gray-500)', marginInlineStart: 8 }}>{store.city}</span>}
                </span>
                <span>›</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Step 1: pick a user ────────────────────────────────────────────────────
  return (
    <div>
      <PageHeader title={t('title')} subtitle={t('admin.pickUser.subtitle')} />
      <div className="filter-bar">
        <SearchInput value={search} onChange={setSearch} placeholder={t('admin.pickUser.searchPlaceholder')} />
      </div>
      <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <DataTable
          columns={[
            { key: 'name', header: t('admin.pickUser.table.name'), render: (u: User) => <span style={{ fontWeight: 500 }}>{u.full_name}</span> },
            { key: 'email', header: t('admin.pickUser.table.email'), render: (u: User) => u.email },
            { key: 'role', header: t('admin.pickUser.table.role'), render: (u: User) => <Badge variant="gray">{formatRole(u.role)}</Badge> },
            {
              key: 'actions',
              header: '',
              render: (u: User) => (
                <Button variant="outline" size="sm" onClick={() => setSelectedUser(u)}>
                  {t('admin.pickUser.table.view')}
                </Button>
              ),
            },
          ]}
          data={fillingUsers}
          loading={usersLoading}
          keyExtractor={(u) => u.id}
          emptyMessage={t('admin.pickUser.table.empty')}
        />
      </motion.div>
    </div>
  );
}
