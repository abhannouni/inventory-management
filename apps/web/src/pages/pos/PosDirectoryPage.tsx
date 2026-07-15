import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { fetchStores } from '../../store/slices/storesSlice';
import PageHeader from '../../components/ui/PageHeader';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import SearchInput from '../../components/ui/SearchInput';
import PosMap from './PosMap';
import PosPreviewCard from './PosPreviewCard';
import { hasCoords } from '../../utils/maps';
import type { Store } from '../../types';

type View = 'map' | 'list';

/** Distinct, sorted option values for a filter dropdown. */
function options(values: (string | null | undefined)[]): string[] {
  return [...new Set(values.filter((v): v is string => !!v))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export default function PosDirectoryPage() {
  const { t } = useTranslation('pos');
  const { t: tStores } = useTranslation('stores');
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { items: stores, loading } = useAppSelector((s) => s.stores);

  const [view, setView] = useState<View>('map');
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('');
  const [city, setCity] = useState('');
  const [chain, setChain] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<Store | null>(null);

  useEffect(() => {
    dispatch(fetchStores());
  }, [dispatch]);

  const regionOptions = useMemo(() => options(stores.map((s) => s.region?.name)), [stores]);
  const cityOptions = useMemo(() => options(stores.map((s) => s.city)), [stores]);
  const chainOptions = useMemo(() => options(stores.map((s) => s.brand)), [stores]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stores.filter((s) => {
      if (q && !s.name.toLowerCase().includes(q)) return false;
      if (region && s.region?.name !== region) return false;
      if (city && s.city !== city) return false;
      if (chain && s.brand !== chain) return false;
      if (status === 'active' && !s.is_active) return false;
      if (status === 'inactive' && s.is_active) return false;
      return true;
    });
  }, [stores, search, region, city, chain, status]);

  const mappable = useMemo(() => filtered.filter(hasCoords).length, [filtered]);
  const isFiltered = !!(search || region || city || chain || status);

  const resetFilters = () => {
    setSearch(''); setRegion(''); setCity(''); setChain(''); setStatus('');
  };

  const viewDetails = (store: Store) => navigate(`/pos/${store.id}`);

  if (loading && stores.length === 0) return <Spinner center size="lg" />;

  return (
    <div className="pos-dir">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      {/* ── Toolbar: search, filters, view toggle ─────────────────────────── */}
      <div className="pos-toolbar">
        <div className="pos-toolbar-search">
          <SearchInput value={search} onChange={setSearch} placeholder={t('searchPlaceholder')} />
        </div>

        <div className="pos-toolbar-filters">
          <select className={`form-select ${region ? 'is-active' : ''}`} value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="">{t('filters.allRegions')}</option>
            {regionOptions.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select className={`form-select ${city ? 'is-active' : ''}`} value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="">{t('filters.allCities')}</option>
            {cityOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className={`form-select ${chain ? 'is-active' : ''}`} value={chain} onChange={(e) => setChain(e.target.value)}>
            <option value="">{t('filters.allChains')}</option>
            {chainOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className={`form-select ${status ? 'is-active' : ''}`} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">{t('filters.allStatuses')}</option>
            <option value="active">{t('filters.active')}</option>
            <option value="inactive">{t('filters.inactive')}</option>
          </select>
          {isFiltered && (
            <button type="button" className="toolbar-reset" onClick={resetFilters}>
              {t('filters.reset')}
            </button>
          )}
        </div>

        <div className="pos-view-toggle">
          <button className={`pos-view-btn ${view === 'map' ? 'is-active' : ''}`} onClick={() => setView('map')}>
            {t('view.map')}
          </button>
          <button className={`pos-view-btn ${view === 'list' ? 'is-active' : ''}`} onClick={() => setView('list')}>
            {t('view.list')}
          </button>
        </div>
      </div>

      {/* Count of what's visible under the current scope + filters. */}
      <div className="pos-count">
        <strong>{filtered.length}</strong> {t('count.pos', { count: filtered.length })}
        {view === 'map' && filtered.length !== mappable && (
          <span className="pos-count-sub">{t('count.mappable', { count: mappable })}</span>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-title">{t('empty.title')}</div>
          <div className="empty-state-subtitle">
            {isFiltered ? t('empty.filtered') : t('empty.scope')}
          </div>
        </div>
      ) : view === 'map' ? (
        <div className="pos-map-wrap">
          <PosMap
            stores={filtered}
            selectedId={selected?.id}
            onSelect={setSelected}
            height="calc(100vh - 320px)"
          />
          {selected && (
            <PosPreviewCard
              store={selected}
              onClose={() => setSelected(null)}
              onViewDetails={() => viewDetails(selected)}
            />
          )}
        </div>
      ) : (
        <motion.div
          className="pos-grid-list"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {filtered.map((s) => (
            <button key={s.id} type="button" className="pos-card-item" onClick={() => viewDetails(s)}>
              <div className="pos-card-item-head">
                <span className="pos-card-item-name">{s.name}</span>
                <Badge variant={s.is_active ? 'success' : 'gray'} dot>
                  {s.is_active ? tStores('map.active', 'Active') : tStores('map.inactive', 'Inactive')}
                </Badge>
              </div>
              {s.brand && <div className="pos-card-item-brand">{s.brand}</div>}
              <div className="pos-card-item-meta">
                {s.channel && <span className="pos-chip">{tStores(`channel.${s.channel}`)}</span>}
                {s.classification && <span className="pos-chip">{s.classification}</span>}
              </div>
              <div className="pos-card-item-addr">
                {[s.address, s.city, s.region?.name].filter(Boolean).join(', ') || '—'}
              </div>
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}
