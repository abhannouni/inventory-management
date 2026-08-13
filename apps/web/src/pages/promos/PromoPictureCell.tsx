import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import CameraCapture from '../visits/CameraCapture';
import { uploadApi } from '../../api/upload.api';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { uploadPromoPicture } from '../../store/slices/promosSlice';
import type { PromoItem } from '../../types';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

interface Props {
  item: PromoItem;
  /** Super Admin viewing another user's picture — thumbnail only, no upload control. */
  readOnly?: boolean;
}

function Thumbnail({ url }: { url: string }) {
  const [broken, setBroken] = useState(false);
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="promo-picture-thumb">
      {broken ? (
        <span className="promo-picture-thumb-fallback">?</span>
      ) : (
        <img src={url} alt="" loading="lazy" onError={() => setBroken(true)} />
      )}
    </a>
  );
}

/**
 * Upload is camera-only, never a gallery/file picker — the picture is proof
 * the promo label is actually up on the shelf right now, not any photo the
 * user happens to have. Same getUserMedia-driven capture as the visit flow.
 */
export default function PromoPictureCell({ item, readOnly }: Props) {
  const { t } = useTranslation('promos');
  const dispatch = useAppDispatch();
  const [uploading, setUploading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  const handleCapture = async (file: File) => {
    setCameraOpen(false);
    if (file.size > MAX_FILE_SIZE) { toast.error(t('toasts.fileTooLarge')); return; }

    setUploading(true);
    try {
      const uploaded = await uploadApi.upload(file);
      const res = await dispatch(uploadPromoPicture({ itemId: item.id, url: uploaded.url }));
      if (uploadPromoPicture.fulfilled.match(res)) {
        toast.success(t('toasts.pictureUploaded'));
      } else {
        toast.error(t('toasts.pictureUploadError'));
      }
    } catch {
      toast.error(t('toasts.pictureUploadError'));
    } finally {
      setUploading(false);
    }
  };

  if (readOnly) {
    if (!item.my_picture) return <span style={{ color: 'var(--gray-400)' }}>—</span>;
    return <Thumbnail url={item.my_picture.image_url} />;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {item.my_picture && <Thumbnail url={item.my_picture.image_url} />}
      <button type="button" className="btn btn-outline btn-sm" onClick={() => setCameraOpen(true)} disabled={uploading}>
        {uploading ? t('picture.uploading') : item.my_picture ? t('picture.replace') : t('picture.add')}
      </button>
      {cameraOpen && <CameraCapture onCapture={handleCapture} onClose={() => setCameraOpen(false)} />}
    </div>
  );
}
