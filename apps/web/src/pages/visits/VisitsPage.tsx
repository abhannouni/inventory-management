import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { useClientPagination } from '../../hooks/useClientPagination';
import { fetchVisits, checkin } from '../../store/slices/visitsSlice';
import { fetchStores } from '../../store/slices/storesSlice';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import Select from '../../components/ui/Select';
import CheckinForm from './CheckinForm';
import MerchandiserFlowPage from './MerchandiserFlowPage';
import VisitTimer from '../../components/ui/VisitTimer';
import { formatDate, formatDurationShort } from '../../utils/format';
import type { Visit } from '../../types';
import { usePermissions } from '../../hooks/usePermissions';

type Tab = 'visit' | 'history';

export default function VisitsPage() {
  const { t, i18n } = useTranslation('visits');
  const { t: tCommon } = useTranslation('common');
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { items: visits, loading } = useAppSelector((s) => s.visits);
  const { items: stores } = useAppSelector((s) => s.stores);
  const p = usePermissions();

  const [activeTab, setActiveTab] = useState<Tab>(p.canCheckin ? 'visit' : 'history');
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [storeFilter, setStoreFilter] = useState('');
  const [merchFilter, setMerchFilter] = useState('');

  useEffect(() => {
    if (activeTab === 'history') {
      dispatch(fetchVisits(statusFilter ? { status: statusFilter } : undefined));
      dispatch(fetchStores());
    }
  }, [dispatch, statusFilter, activeTab]);

  const openVisit = visits.find((v) => v.status === 'open');

  /* Store and merchandiser dropdowns are built from whatever visits are already
     loaded — no separate lookup call, and the options never outrun what's
     actually filterable on screen. */
  const storeOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const v of visits) if (v.store) map.set(v.store.id, v.store.name);
    return [...map.entries()]
      .sort(([, a], [, b]) => a.localeCompare(b))
      .map(([value, label]) => ({ value, label }));
  }, [visits]);

  const merchOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const v of visits) if (v.user) map.set(v.user.id, v.user.full_name);
    return [...map.entries()]
      .sort(([, a], [, b]) => a.localeCompare(b))
      .map(([value, label]) => ({ value, label }));
  }, [visits]);

  const filteredVisits = useMemo(() => {
    const q = search.trim().toLowerCase();
    return visits.filter((v) => {
      const matchesSearch =
        !q ||
        v.store?.name?.toLowerCase().includes(q) ||
        v.user?.full_name?.toLowerCase().includes(q);
      const matchesStore = !storeFilter || v.store_id === storeFilter;
      const matchesMerch = !merchFilter || v.user_id === merchFilter;
      return matchesSearch && matchesStore && matchesMerch;
    });
  }, [visits, search, storeFilter, merchFilter]);

  const hasActiveFilters = !!search || !!storeFilter || !!merchFilter || !!statusFilter;

  const clearFilters = () => {
    setSearch('');
    setStoreFilter('');
    setMerchFilter('');
    setStatusFilter('');
  };

  const { pageItems: visitPage, meta, setPage, setLimit } = useClientPagination(filteredVisits);

  const handleCheckin = async (data: { store_id: string; lat: number; lng: number }) => {
    const res = await dispatch(checkin(data));
    if (checkin.fulfilled.match(res)) {
      toast.success(t('list.toasts.checkinSuccess'));
      setCheckinOpen(false);
    } else {
      toast.error((res.payload as string) || t('list.toasts.checkinFailed'));
    }
  };

  const columns = [
    { key: 'store', header: t('list.columns.store'), render: (v: Visit) => <span style={{ fontWeight: 500 }}>{v.store?.name || v.store_id}</span> },
    { key: 'merchandiser', header: t('list.columns.merchandiser'), render: (v: Visit) => <span style={{ color: 'var(--gray-600)' }}>{v.user?.full_name || '—'}</span> },
    { key: 'status', header: t('list.columns.status'), render: (v: Visit) => <Badge variant={v.status === 'open' ? 'success' : 'gray'} dot>{v.status === 'open' ? tCommon('status.open') : tCommon('status.closed')}</Badge> },
    { key: 'checkin_at', header: t('list.columns.checkin'), render: (v: Visit) => <span style={{ color: 'var(--gray-600)' }}>{formatDate(v.checkin_at, i18n.language)}</span> },
    { key: 'checkout_at', header: t('list.columns.checkout'), render: (v: Visit) => <span style={{ color: 'var(--gray-500)' }}>{v.checkout_at ? formatDate(v.checkout_at, i18n.language) : '—'}</span> },
    {
      key: 'duration',
      header: t('list.columns.duration'),
      render: (v: Visit) =>
        v.status === 'open'
          ? <VisitTimer visit={v} variant="inline" />
          : <span style={{ color: 'var(--gray-600)', fontVariantNumeric: 'tabular-nums' }}>{formatDurationShort(v.duration_seconds)}</span>,
    },
    {
      key: 'gps',
      header: t('list.columns.gpsIn'),
      render: (v: Visit) => (
        <span className="gps-coords">
          {v.checkin_lat != null && v.checkin_lng != null
            ? `${Number(v.checkin_lat).toFixed(4)}, ${Number(v.checkin_lng).toFixed(4)}`
            : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: t('list.columns.actions'),
      render: (v: Visit) => (
        <div className="table-actions">
          <Button variant="outline" size="sm" onClick={() => navigate(`/visits/${v.id}`)}>{t('list.view')}</Button>
          {/* An open visit is resumed, never closed from here: it can only be
              completed by finishing the audit in the visit flow. */}
          {v.status === 'open' && p.canCheckin && (
            <Button variant="secondary" size="sm" onClick={() => setActiveTab('visit')}>{t('list.resumeVisit')}</Button>
          )}
        </div>
      ),
    },
  ];

  /* ─── History panel (shared between tab and admin view) ─── */
  const historyPanel = (
    <div>
      {!p.canCheckin && (
        <PageHeader
          title={t('list.title')}
          subtitle={t('list.subtitle')}
          actions={
            p.canCheckin && (
              <Button icon={<LocationIcon />} onClick={() => setCheckinOpen(true)} disabled={!!openVisit}>
                {t('list.checkIn')}
              </Button>
            )
          }
        />
      )}

      {openVisit && p.canCheckin && (
        <motion.div className="open-visit-banner" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="open-visit-banner-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="open-visit-banner-body">
            <div className="open-visit-banner-title">{t('list.activeVisit')}</div>
            <div className="open-visit-banner-store">{openVisit.store?.name}</div>
          </div>
          <VisitTimer visit={openVisit} variant="inline" />
          <Button size="sm" onClick={() => setActiveTab('visit')}>{t('list.resumeVisit')}</Button>
        </motion.div>
      )}

      <div className="filter-bar">
        <div className="form-group" style={{ flex: 1, maxWidth: 320 }}>
          <input
            className="form-input"
            placeholder={t('list.filters.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: 160 }}>
          <option value="">{t('list.filters.allStatuses')}</option>
          <option value="open">{tCommon('status.open')}</option>
          <option value="closed">{tCommon('status.closed')}</option>
        </select>
        <Select
          options={storeOptions}
          placeholder={t('list.filters.allStores')}
          value={storeFilter}
          onChange={(e) => setStoreFilter(e.target.value)}
          style={{ minWidth: 160 }}
        />
        {/* A merchandiser only ever sees their own visits (server-scoped), so this
            dropdown would always have exactly one option — not worth showing. */}
        {merchOptions.length > 1 && (
          <Select
            options={merchOptions}
            placeholder={t('list.filters.allMerchandisers')}
            value={merchFilter}
            onChange={(e) => setMerchFilter(e.target.value)}
            style={{ minWidth: 160 }}
          />
        )}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>{t('list.filters.clear')}</Button>
        )}
      </div>

      {/* Mobile card list */}
      <div className="visit-card-list">
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--gray-400)', padding: '32px 0' }}>{t('list.loading')}</p>
        ) : visitPage.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--gray-400)', padding: '32px 0' }}>{t('list.empty')}</p>
        ) : (
          visitPage.map((v) => (
            <motion.div
              key={v.id}
              className="visit-card"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => navigate(`/visits/${v.id}`)}
              style={{ cursor: 'pointer' }}
              whileHover={{ y: -1 }}
            >
              <div className="visit-card-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z" />
                </svg>
              </div>
              <div className="visit-card-body">
                <div className="visit-card-store">{v.store?.name || v.store_id}</div>
                <div className="visit-card-time">
                  {formatDate(v.checkin_at, i18n.language)}
                  {v.user?.full_name ? ` · ${v.user.full_name}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                <Badge variant={v.status === 'open' ? 'success' : 'gray'} dot>
                  {v.status === 'open' ? tCommon('status.open') : tCommon('status.closed')}
                </Badge>
                {v.status === 'open' && p.canCheckin && (
                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setActiveTab('visit'); }}>
                    {t('list.resumeVisit')}
                  </Button>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="visit-table-wrap">
        <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <DataTable columns={columns} data={visitPage} loading={loading} keyExtractor={(v) => v.id} emptyMessage={t('list.empty')} />
        </motion.div>
      </div>

      <Pagination meta={meta} onPageChange={setPage} onLimitChange={setLimit} />

      {/* FAB for check-in (mobile, merchandisers only) */}
      {p.canCheckin && !openVisit && (
        <button className="fab" onClick={() => setCheckinOpen(true)} title={t('list.checkIn')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
            <line x1="12" y1="5" x2="12" y2="9" /><line x1="10" y1="7" x2="14" y2="7" />
          </svg>
        </button>
      )}

      <Modal open={checkinOpen} onClose={() => setCheckinOpen(false)} title={t('list.checkInToStore')} size="sm">
        <CheckinForm stores={stores} onSubmit={handleCheckin} onCancel={() => setCheckinOpen(false)} />
      </Modal>
    </div>
  );

  /* ─── Admin view: no tabs, just history ─── */
  if (!p.canCheckin) return historyPanel;

  /* ─── Merchandiser/Supervisor view: tabs ─── */
  return (
    <div>
      {/* Tab switcher */}
      <div className="visits-tab-bar">
        <button
          className={`visits-tab-btn${activeTab === 'visit' ? ' active' : ''}`}
          onClick={() => setActiveTab('visit')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/>
          </svg>
          {t('list.tabs.myVisit')}
        </button>
        <button
          className={`visits-tab-btn${activeTab === 'history' ? ' active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          {t('list.tabs.history')}
        </button>
      </div>

      {activeTab === 'visit'    && <MerchandiserFlowPage onViewHistory={() => setActiveTab('history')} />}
      {activeTab === 'history'  && historyPanel}
    </div>
  );
}

function LocationIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z" />
    </svg>
  );
}
