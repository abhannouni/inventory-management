import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { fetchProducts } from '../../store/slices/productsSlice';
import { uploadApi } from '../../api/upload.api';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import CameraCapture from '../visits/CameraCapture';
import type { CreateProductRequestPayload } from '../../api/product-requests.api';
import type { ProductRequest, Store } from '../../types';

interface ProductRequestFormProps {
  stores: Store[];
  initialData?: ProductRequest;
  onSubmit: (data: CreateProductRequestPayload) => Promise<void>;
  onCancel: () => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export default function ProductRequestForm({ stores, initialData, onSubmit, onCancel }: ProductRequestFormProps) {
  const { t } = useTranslation('productRequests');
  const { t: tCommon } = useTranslation('common');
  const dispatch = useAppDispatch();
  const { items: products } = useAppSelector((s) => s.products);

  const [form, setForm] = useState({
    store_id: initialData?.store_id || '',
    sous_famille: initialData?.sous_famille || '',
    width: initialData?.width?.toString() || '',
    height: initialData?.height?.toString() || '',
    depth: initialData?.depth?.toString() || '',
    image_url: initialData?.image_url || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(initialData?.image_url || '');
  const [cameraOpen, setCameraOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { dispatch(fetchProducts()); }, [dispatch]);

  const sousFamilleOptions = useMemo(() => {
    const values = new Set(products.map((prod) => prod.sous_famille).filter(Boolean));
    // Editing a request whose sous_famille isn't (or no longer is) in the
    // product catalogue would otherwise render as a blank select — include it
    // explicitly so the current value is always visible, not silently hidden.
    if (initialData?.sous_famille) values.add(initialData.sous_famille);
    return Array.from(values)
      .sort((a, b) => a.localeCompare(b))
      .map((v) => ({ value: v, label: v }));
  }, [products, initialData?.sous_famille]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.store_id) errs.store_id = t('errors.storeRequired');
    if (!form.sous_famille) errs.sous_famille = t('errors.sousFamilleRequired');
    if (!form.width) errs.width = t('errors.widthRequired');
    else if (isNaN(Number(form.width)) || Number(form.width) <= 0) errs.width = t('errors.widthInvalid');
    if (!form.height) errs.height = t('errors.heightRequired');
    else if (isNaN(Number(form.height)) || Number(form.height) <= 0) errs.height = t('errors.heightInvalid');
    if (!form.depth) errs.depth = t('errors.depthRequired');
    else if (isNaN(Number(form.depth)) || Number(form.depth) <= 0) errs.depth = t('errors.depthInvalid');
    if (!form.image_url) errs.image_url = t('errors.photoRequired');
    return errs;
  };

  const uploadFile = async (file: File) => {
    if (file.size > MAX_FILE_SIZE) { toast.error(t('toasts.fileTooLarge')); return; }
    if (!ALLOWED_TYPES.includes(file.type)) { toast.error(t('toasts.invalidFileType')); return; }

    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const res = await uploadApi.upload(file);
      setForm((f) => ({ ...f, image_url: res.url }));
      toast.success(t('toasts.photoUploaded'));
    } catch {
      toast.error(t('toasts.photoUploadError'));
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const handleCameraCapture = (file: File) => {
    setCameraOpen(false);
    uploadFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    await onSubmit({
      store_id: form.store_id,
      sous_famille: form.sous_famille,
      width: Number(form.width),
      height: Number(form.height),
      depth: Number(form.depth),
      image_url: form.image_url,
    });
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Select
        label={t('fields.store')}
        value={form.store_id}
        onChange={(e) => setForm({ ...form, store_id: e.target.value })}
        options={stores.map((s) => ({ value: s.id, label: s.name }))}
        placeholder={t('fields.storePlaceholder')}
        error={errors.store_id}
      />

      <Select
        label={t('fields.sousFamille')}
        value={form.sous_famille}
        onChange={(e) => setForm({ ...form, sous_famille: e.target.value })}
        options={sousFamilleOptions}
        placeholder={t('fields.sousFamillePlaceholder')}
        error={errors.sous_famille}
      />

      <div className="form-row">
        <Input label={t('fields.width')} type="number" min="0" step="0.01" value={form.width} onChange={(e) => setForm({ ...form, width: e.target.value })} error={errors.width} />
        <Input label={t('fields.height')} type="number" min="0" step="0.01" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} error={errors.height} />
        <Input label={t('fields.depth')} type="number" min="0" step="0.01" value={form.depth} onChange={(e) => setForm({ ...form, depth: e.target.value })} error={errors.depth} />
      </div>

      <div className="form-group">
        <label className="form-label">{t('fields.photoLabel')}</label>
        <div className="photo-upload" onClick={() => fileRef.current?.click()}>
          {uploading ? (
            <p style={{ color: 'var(--gray-500)' }}>{t('fields.photoUploading')}</p>
          ) : preview ? (
            <>
              <img src={preview} alt="preview" className="photo-preview" />
              <p style={{ marginTop: 8, fontSize: 12, color: 'var(--gray-400)' }}>{t('fields.photoChangeHint')}</p>
            </>
          ) : (
            <>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="1.5" style={{ margin: '0 auto 8px' }}>
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>{t('fields.photoUploadHint')}</p>
              <p style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 4 }}>{t('fields.photoFormatsHint')}</p>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" style={{ display: 'none' }} onChange={handleFileChange} />
        {errors.image_url && <p className="form-error">{errors.image_url}</p>}
        <Button type="button" variant="outline" size="sm" style={{ marginTop: 8 }} onClick={() => setCameraOpen(true)} disabled={uploading}>
          {t('fields.takePhoto')}
        </Button>
      </div>

      <div className="form-actions">
        <Button variant="ghost" type="button" onClick={onCancel} disabled={loading || uploading}>{tCommon('actions.cancel')}</Button>
        <Button type="submit" loading={loading} disabled={uploading}>{initialData ? tCommon('actions.update') : tCommon('actions.create')}</Button>
      </div>

      {cameraOpen && <CameraCapture onCapture={handleCameraCapture} onClose={() => setCameraOpen(false)} />}
    </form>
  );
}
