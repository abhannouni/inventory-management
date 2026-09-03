import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { fetchStores } from '../../store/slices/storesSlice';
import { fetchDraft, saveDraft, startNewRound } from '../../store/slices/priceSurveysSlice';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Spinner from '../../components/ui/Spinner';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import SlideTabs from './SlideTabs';
import type { Slide } from './SlideTabs';
import PriceSurveyGrid from './PriceSurveyGrid';
import { itemToFormValues, formValuesToItemPayload } from './itemFormValues';
import type { ItemFormValues } from './itemFormValues';

export default function PriceSurveyFillingView() {
  const { t } = useTranslation('priceSurveys');
  const dispatch = useAppDispatch();

  const { items: stores } = useAppSelector((s) => s.stores);
  const { draft, loading, saving } = useAppSelector((s) => s.priceSurveys);

  const [storeId, setStoreId] = useState('');
  const [itemValues, setItemValues] = useState<Record<string, ItemFormValues>>({});
  const [dirty, setDirty] = useState(false);
  const [activeSlide, setActiveSlide] = useState<string>('');
  const [newRoundOpen, setNewRoundOpen] = useState(false);
  const [startingNewRound, setStartingNewRound] = useState(false);

  useEffect(() => {
    dispatch(fetchStores());
  }, [dispatch]);

  useEffect(() => {
    if (storeId || !stores.length) return;
    setStoreId(stores[0].id);
  }, [stores, storeId]);

  useEffect(() => {
    if (!storeId) return;
    dispatch(fetchDraft({ storeId }));
  }, [storeId, dispatch]);

  useEffect(() => {
    if (!draft) return;
    const nextItemValues: Record<string, ItemFormValues> = {};
    for (const item of draft.items) nextItemValues[item.id] = itemToFormValues(item);
    setItemValues(nextItemValues);
    setDirty(false);
  }, [draft]);

  const slides: Slide[] = useMemo(() => {
    if (!draft) return [];
    const categories = Array.from(new Set(draft.items.map((i) => i.product?.category).filter(Boolean))) as string[];
    categories.sort((a, b) => a.localeCompare(b));
    return categories.map((c) => ({ key: c, label: c }));
  }, [draft]);

  useEffect(() => {
    if (!slides.length) return;
    if (!slides.find((s) => s.key === activeSlide)) setActiveSlide(slides[0].key);
  }, [slides, activeSlide]);

  const itemsForActiveSlide = useMemo(() => {
    if (!draft || !activeSlide) return [];
    return draft.items.filter((i) => i.product?.category === activeSlide);
  }, [draft, activeSlide]);

  const handleItemFieldChange = (itemId: string, field: keyof ItemFormValues, value: string) => {
    setItemValues((prev) => ({ ...prev, [itemId]: { ...prev[itemId], [field]: value } }));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!draft) return;
    const items = draft.items.map((item) => formValuesToItemPayload(item.id, itemValues[item.id]));
    const res = await dispatch(saveDraft({ id: draft.id, payload: { items } }));
    if (saveDraft.fulfilled.match(res)) {
      toast.success(t('toasts.saveSuccess'));
    } else {
      toast.error(t('toasts.saveError'));
    }
  };

  const handleNewRound = async () => {
    if (!draft) return;
    setStartingNewRound(true);
    const res = await dispatch(startNewRound(draft.id));
    setStartingNewRound(false);
    setNewRoundOpen(false);
    if (startNewRound.fulfilled.match(res)) {
      toast.success(t('toasts.newRoundSuccess'));
    } else {
      toast.error(t('toasts.newRoundError'));
    }
  };

  if (!stores.length) {
    return (
      <div>
        <PageHeader title={t('title')} subtitle={t('subtitle')} />
        <div className="card">
          <p style={{ color: 'var(--gray-500)' }}>{t('noStores')}</p>
        </div>
      </div>
    );
  }

  const hasProducts = !!draft && draft.items.length > 0;

  return (
    <div>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="outline" onClick={() => setNewRoundOpen(true)} disabled={!draft || !hasProducts}>
              {t('actions.newRound')}
            </Button>
            <Button onClick={handleSave} loading={saving} disabled={!draft || !dirty}>
              {t('actions.save')}
            </Button>
          </div>
        }
      />

      {stores.length > 1 && (
        <div className="filter-bar">
          <Select
            label={t('pdvSwitcher.label')}
            options={stores.map((s) => ({ value: s.id, label: s.name }))}
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            style={{ minWidth: 260 }}
          />
        </div>
      )}

      {loading || !draft ? (
        <Spinner center size="lg" />
      ) : !hasProducts ? (
        <div className="card">
          <p style={{ color: 'var(--gray-500)' }}>{t('emptyState.filler')}</p>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 16 }}>
            <SlideTabs slides={slides} active={activeSlide} onChange={setActiveSlide} />
          </div>

          <div className="card">
            <PriceSurveyGrid
              items={itemsForActiveSlide}
              values={itemValues}
              onFieldChange={handleItemFieldChange}
              editable
            />
          </div>
        </>
      )}

      <ConfirmDialog
        open={newRoundOpen}
        onClose={() => setNewRoundOpen(false)}
        onConfirm={handleNewRound}
        loading={startingNewRound}
        confirmLabel={t('actions.newRound')}
        message={t('newRoundConfirm.message')}
      />
    </div>
  );
}
