import { useState } from 'react';
import { toast } from 'react-toastify';
import CameraCapture from './CameraCapture';
import { uploadApi } from '../../api/upload.api';
import type { VisitReportCategory } from '../../types';

const MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10 MB — kept in sync with the API's upload limit
const MAX_PHOTOS = 10;

const CATEGORIES: VisitReportCategory[] = ['display', 'tg', 'mea', 'plv'];

export interface ReportCardLabels {
  cardTitle: string;
  photoLabel: string;
  takePhoto: string;
  addPhoto: string;
  removePhoto: string;
  photoAlt: string;
  uploading: string;
  categoryLabel: string;
  categoryOptions: Record<VisitReportCategory, string>;
  noteLabel: string;
  notePlaceholder: string;
  removeCard: string;
  fileTooLarge: string;
  uploadFailed: string;
}

interface ReportCardProps {
  index: number;
  labels: ReportCardLabels;
  category: VisitReportCategory | null;
  onCategoryChange: (category: VisitReportCategory) => void;
  note: string;
  onNoteChange: (note: string) => void;
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  onRemove?: () => void;
}

/**
 * One supervisor report card: camera-only photos (1–10), a single-select
 * category (Display/TG/MEA/PLV), and an optional note. Unlike the merchandiser
 * flow's PhotoNoteStep, every photo — not just the first — must come from the
 * live camera, never a gallery/file picker.
 */
export default function ReportCard({
  index,
  labels,
  category,
  onCategoryChange,
  note,
  onNoteChange,
  photos,
  onPhotosChange,
  onRemove,
}: ReportCardProps) {
  const [uploading, setUploading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  const handleCameraCapture = async (file: File) => {
    setCameraOpen(false);
    if (file.size > MAX_PHOTO_SIZE) { toast.error(labels.fileTooLarge); return; }
    setUploading(true);
    try {
      const res = await uploadApi.upload(file);
      onPhotosChange([...photos, res.url]);
    } catch (err) {
      toast.error((err as Error).message || labels.uploadFailed);
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (idx: number) => onPhotosChange(photos.filter((_, i) => i !== idx));

  return (
    <div className="sf-report-card">
      <div className="sf-report-card-header">
        <span className="sf-report-card-title">{labels.cardTitle} {index + 1}</span>
        {onRemove && (
          <button type="button" className="sf-remove-card-btn" onClick={onRemove}>
            {labels.removeCard}
          </button>
        )}
      </div>

      {/* Photos — camera only, no gallery/file picker, 1–10 photos */}
      <div className="form-group" style={{ marginBottom: 16 }}>
        <label className="form-label">{labels.photoLabel} *</label>

        {photos.length === 0 ? (
          <button
            type="button"
            className="photo-capture-btn"
            onClick={() => setCameraOpen(true)}
            disabled={uploading}
          >
            {uploading ? (
              <span style={{ fontSize: 13 }}>{labels.uploading}</span>
            ) : (
              <>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                {labels.takePhoto}
              </>
            )}
          </button>
        ) : (
          <>
            <div className="sf-photo-grid">
              {photos.map((url, idx) => (
                <div key={url + idx} className="sf-photo-item">
                  <img src={url} alt={labels.photoAlt} />
                  <button
                    type="button"
                    className="sf-photo-remove"
                    onClick={() => removePhoto(idx)}
                    aria-label={labels.removePhoto}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            {photos.length < MAX_PHOTOS && (
              <button
                type="button"
                className="sf-add-photo-btn"
                onClick={() => setCameraOpen(true)}
                disabled={uploading}
              >
                {uploading ? labels.uploading : `+ ${labels.addPhoto}`}
              </button>
            )}
          </>
        )}
      </div>

      {/* Category — single select */}
      <div className="form-group" style={{ marginBottom: 16 }}>
        <label className="form-label">{labels.categoryLabel} *</label>
        <div className="sf-category-group">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`sf-category-option${category === cat ? ' selected' : ''}`}
              onClick={() => onCategoryChange(cat)}
              aria-pressed={category === cat}
            >
              <span className="sf-category-check">
                {category === cat && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </span>
              {labels.categoryOptions[cat]}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label">{labels.noteLabel}</label>
        <textarea
          className="form-textarea"
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder={labels.notePlaceholder}
          rows={3}
        />
      </div>

      {cameraOpen && <CameraCapture onCapture={handleCameraCapture} onClose={() => setCameraOpen(false)} />}
    </div>
  );
}
