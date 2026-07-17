import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { bulkImportProducts } from '../../store/slices/productsSlice';
import { downloadProductImportTemplate } from '../../utils/productImportTemplate';
import type { BulkImportResult } from '../../api/products.api';

interface Props {
  onClose: () => void;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ProductBulkImportModal({ onClose }: Props) {
  const { t } = useTranslation('products');
  const { t: tCommon } = useTranslation('common');
  const dispatch = useAppDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);

  const handlePickFile = (f: File | null) => {
    setFile(f);
    setResult(null);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    const res = await dispatch(bulkImportProducts(file));
    setLoading(false);
    if (bulkImportProducts.fulfilled.match(res)) {
      setResult(res.payload);
      if (res.payload.created > 0) toast.success(t('bulkImport.toasts.importSuccess', { count: res.payload.created }));
      if (res.payload.failed === 0) {
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } else {
      toast.error((res.payload as string) || t('bulkImport.toasts.importError'));
    }
  };

  return (
    <div>
      <div className="import-template-card">
        <span className="import-template-icon"><FileExcelIcon /></span>
        <div className="import-template-text">
          <strong>{t('bulkImport.templateTitle')}</strong>
          <span>{t('bulkImport.instructions')}</span>
        </div>
        <Button type="button" variant="outline" size="sm" icon={<DownloadIcon />} onClick={() => downloadProductImportTemplate()}>
          {t('bulkImport.downloadTemplate')}
        </Button>
      </div>

      <div className="form-group">
        <label className="form-label">{t('bulkImport.fileLabel')}</label>

        {file ? (
          <div className="import-file-chip">
            <span className="import-file-chip-icon"><FileExcelIcon /></span>
            <div className="import-file-chip-info">
              <strong>{file.name}</strong>
              <span>{formatFileSize(file.size)}</span>
            </div>
            <button type="button" className="import-file-chip-remove" onClick={handleRemoveFile} aria-label={tCommon('actions.close')}>
              <XIcon />
            </button>
          </div>
        ) : (
          <button type="button" className="import-dropzone" onClick={() => fileInputRef.current?.click()}>
            <UploadCloudIcon />
            <strong>{t('bulkImport.chooseFile')}</strong>
            <span>{t('bulkImport.fileHint')}</span>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          style={{ display: 'none' }}
          onChange={(e) => handlePickFile(e.target.files?.[0] || null)}
        />
      </div>

      {result && (
        <div className="import-summary">
          <div className="import-summary-stats">
            <div className="import-summary-stat success">
              <div className="value">{result.created}</div>
              <div className="label">{t('bulkImport.created')}</div>
            </div>
            <div className="import-summary-stat failed">
              <div className="value">{result.failed}</div>
              <div className="label">{t('bulkImport.failed')}</div>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="import-error-list">
              {result.errors.map((e) => (
                <div key={e.row} className="import-error-row">
                  <span className="row-num">{t('bulkImport.rowLabel', { row: e.row })}</span>
                  <span className="row-msg">{e.message}</span>
                </div>
              ))}
            </div>
          )}
          {result.created > 0 && result.failed === 0 && (
            <div style={{ padding: '10px 16px' }}>
              <Badge variant="success">{t('bulkImport.allImported')}</Badge>
            </div>
          )}
        </div>
      )}

      <div className="form-actions" style={{ marginTop: 20 }}>
        <Button variant="ghost" type="button" onClick={onClose} disabled={loading}>
          {tCommon('actions.close')}
        </Button>
        <Button type="button" onClick={handleImport} loading={loading} disabled={!file}>
          {t('bulkImport.import')}
        </Button>
      </div>
    </div>
  );
}

function FileExcelIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M8 13l2.5 5M10.5 13L8 18" />
      <path d="M16 13l-2.5 5M13.5 13l2.5 5" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function UploadCloudIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 16l-4-4-4 4" /><path d="M12 12v9" />
      <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
