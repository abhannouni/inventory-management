import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import Button from '../../components/ui/Button';
import MultiSelectSearch from '../../components/ui/MultiSelectSearch';
import type { SellOut, Store, Product } from '../../types';

interface Props {
  items: SellOut[];
  onClose: () => void;
}

const HEADER_FILL = 'FF1D6ADE'; // matches --primary
const HEADER_FONT = 'FFFFFFFF';

export default function SellOutExportModal({ items, onClose }: Props) {
  const { t } = useTranslation('sellOut');
  const { t: tCommon } = useTranslation('common');

  const [storeIds, setStoreIds] = useState<string[]>([]);
  const [productIds, setProductIds] = useState<string[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);

  const stores = useMemo(
    () =>
      Array.from(new Map(items.filter((r) => r.store).map((r) => [r.store!.id, r.store!])).values()).sort(
        (a: Store, b: Store) => a.name.localeCompare(b.name),
      ),
    [items],
  );

  const products = useMemo(
    () =>
      Array.from(new Map(items.filter((r) => r.product).map((r) => [r.product!.id, r.product!])).values()).sort(
        (a: Product, b: Product) => a.name.localeCompare(b.name),
      ),
    [items],
  );

  const storeIdSet = useMemo(() => new Set(storeIds), [storeIds]);
  const productIdSet = useMemo(() => new Set(productIds), [productIds]);

  const filtered = items.filter((row) => {
    if (storeIdSet.size && (!row.store || !storeIdSet.has(row.store.id))) return false;
    if (productIdSet.size && (!row.product || !productIdSet.has(row.product.id))) return false;
    const rowDate = row.created_at ? String(row.created_at).slice(0, 10) : '';
    if (from && rowDate < from) return false;
    if (to && rowDate > to) return false;
    return true;
  });

  const handleDownload = async () => {
    setBusy(true);
    try {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(t('title'));

      const columns = [
        t('table.product'),
        t('table.sku'),
        t('table.store'),
        t('table.quantity'),
        t('table.price'),
        t('table.date'),
      ];
      sheet.addRow(columns);
      filtered.forEach((row) => {
        sheet.addRow([
          row.product?.name ?? '',
          row.product?.sku ?? '',
          row.store?.name ?? '',
          row.quantity,
          Number(row.price),
          row.created_at ? String(row.created_at).slice(0, 10) : '',
        ]);
      });

      const headerRow = sheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
        cell.font = { color: { argb: HEADER_FONT }, bold: true };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      });
      headerRow.height = 20;
      sheet.columns = columns.map((c) => ({ width: Math.max(c.length + 4, 18) }));

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sell-out-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      onClose();
    } catch {
      toast.error(t('exportModal.toasts.exportError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <MultiSelectSearch
        label={t('fields.store')}
        placeholder={t('exportModal.searchStores')}
        items={stores}
        selectedIds={storeIds}
        onChange={setStoreIds}
        getKey={(s) => s.id}
        getPrimary={(s) => s.name}
        getSecondary={(s) => s.city || undefined}
        noResultsLabel={t('search.noResults')}
        typeToSearchLabel={t('search.typeToSearch')}
      />

      <div style={{ height: 14 }} />

      <MultiSelectSearch
        label={t('fields.product')}
        placeholder={t('exportModal.searchProducts')}
        items={products}
        selectedIds={productIds}
        onChange={setProductIds}
        getKey={(p) => p.id}
        getPrimary={(p) => p.name}
        getSecondary={(p) => p.sku}
        noResultsLabel={t('search.noResults')}
        typeToSearchLabel={t('search.typeToSearch')}
      />

      <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">{t('exportModal.from')}</label>
          <input
            type="date"
            className="form-input"
            value={from}
            max={to || undefined}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">{t('exportModal.to')}</label>
          <input
            type="date"
            className="form-input"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>

      <p style={{ color: 'var(--gray-500)', fontSize: 13, margin: '4px 0 0' }}>
        {t('exportModal.rowCount', { count: filtered.length })}
      </p>

      <div className="form-actions" style={{ marginTop: 20 }}>
        <Button variant="ghost" type="button" onClick={onClose} disabled={busy}>
          {tCommon('actions.close')}
        </Button>
        <Button type="button" onClick={handleDownload} loading={busy} disabled={filtered.length === 0}>
          {t('exportModal.download')}
        </Button>
      </div>
    </div>
  );
}
