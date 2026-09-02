import { useTranslation } from 'react-i18next';
import DataTable from '../../components/ui/DataTable';
import { handleNumberInputKeyDown } from '../../utils/numberInput';
import type { PriceSurveyItem } from '../../types';
import type { ItemFormValues } from './itemFormValues';

interface PriceSurveyGridProps {
  items: PriceSurveyItem[];
  values: Record<string, ItemFormValues>;
  onFieldChange: (itemId: string, field: keyof ItemFormValues, value: string) => void;
  editable: boolean;
}

function Cell({
  value,
  editable,
  onChange,
  type = 'text',
}: {
  value: string;
  editable: boolean;
  onChange?: (v: string) => void;
  type?: 'text' | 'number';
}) {
  if (!editable) return <span>{value || '—'}</span>;
  return (
    <input
      type={type}
      inputMode={type === 'number' ? 'decimal' : undefined}
      className="form-input"
      style={{ minWidth: type === 'number' ? 90 : 130 }}
      value={value}
      onKeyDown={type === 'number' ? handleNumberInputKeyDown : undefined}
      onChange={(e) => onChange?.(e.target.value)}
    />
  );
}

export default function PriceSurveyGrid({ items, values, onFieldChange, editable }: PriceSurveyGridProps) {
  const { t } = useTranslation('priceSurveys');

  const columns = [
    {
      key: 'product',
      header: t('grid.columns.product'),
      render: (item: PriceSurveyItem) => (
        <div>
          <div style={{ fontWeight: 500 }}>{item.product?.name || '—'}</div>
          {item.product?.sku && <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>{item.product.sku}</div>}
        </div>
      ),
    },
    {
      key: 'cl',
      header: t('grid.columns.cl'),
      render: (item: PriceSurveyItem) => item.product?.format || '—',
    },
    {
      key: 'price_normal',
      header: t('grid.columns.priceNormal'),
      render: (item: PriceSurveyItem) => (
        <Cell
          type="number"
          value={values[item.id]?.price_normal ?? ''}
          editable={editable}
          onChange={(v) => onFieldChange(item.id, 'price_normal', v)}
        />
      ),
    },
    {
      key: 'price_promo',
      header: t('grid.columns.pricePromo'),
      render: (item: PriceSurveyItem) => (
        <Cell
          type="number"
          value={values[item.id]?.price_promo ?? ''}
          editable={editable}
          onChange={(v) => onFieldChange(item.id, 'price_promo', v)}
        />
      ),
    },
    {
      key: 'etat',
      header: t('grid.columns.etat'),
      render: (item: PriceSurveyItem) => (
        <Cell
          value={values[item.id]?.etat ?? ''}
          editable={editable}
          onChange={(v) => onFieldChange(item.id, 'etat', v)}
        />
      ),
    },
    {
      key: 'competitor_name',
      header: t('grid.columns.competitorName'),
      render: (item: PriceSurveyItem) => (
        <Cell
          value={values[item.id]?.competitor_name ?? ''}
          editable={editable}
          onChange={(v) => onFieldChange(item.id, 'competitor_name', v)}
        />
      ),
    },
    {
      key: 'competitor_cl',
      header: t('grid.columns.competitorCl'),
      render: (item: PriceSurveyItem) => (
        <Cell
          value={values[item.id]?.competitor_cl ?? ''}
          editable={editable}
          onChange={(v) => onFieldChange(item.id, 'competitor_cl', v)}
        />
      ),
    },
    {
      key: 'competitor_price_normal',
      header: t('grid.columns.competitorPriceNormal'),
      render: (item: PriceSurveyItem) => (
        <Cell
          type="number"
          value={values[item.id]?.competitor_price_normal ?? ''}
          editable={editable}
          onChange={(v) => onFieldChange(item.id, 'competitor_price_normal', v)}
        />
      ),
    },
    {
      key: 'competitor_price_promo',
      header: t('grid.columns.competitorPricePromo'),
      render: (item: PriceSurveyItem) => (
        <Cell
          type="number"
          value={values[item.id]?.competitor_price_promo ?? ''}
          editable={editable}
          onChange={(v) => onFieldChange(item.id, 'competitor_price_promo', v)}
        />
      ),
    },
    {
      key: 'competitor_etat',
      header: t('grid.columns.competitorEtat'),
      render: (item: PriceSurveyItem) => (
        <Cell
          value={values[item.id]?.competitor_etat ?? ''}
          editable={editable}
          onChange={(v) => onFieldChange(item.id, 'competitor_etat', v)}
        />
      ),
    },
  ];

  return (
    <DataTable columns={columns} data={items} keyExtractor={(item) => item.id} emptyMessage={t('grid.empty')} />
  );
}
