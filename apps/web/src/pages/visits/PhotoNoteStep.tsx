import { useRef, useState } from 'react';
import { toast } from 'react-toastify';
import CameraCapture from './CameraCapture';
import { uploadApi } from '../../api/upload.api';

const MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10 MB — kept in sync with the API's upload limit

export interface PhotoNoteStepLabels {
  photoLabel: string;
  takePhoto: string;
  addPhoto: string;
  removePhoto: string;
  photoAlt: string;
  uploading: string;
  noteLabel: string;
  notePlaceholder: string;
  continueLabel: string;
  fileTooLarge: string;
  uploadFailed: string;
}

interface PhotoNoteStepProps {
  labels: PhotoNoteStepLabels;
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  note: string;
  onNoteChange: (note: string) => void;
  busy: boolean;
  onContinue: () => void;
}

/**
 * A required-camera-photo + optional-gallery-photos + optional-note block.
 * Shared by the supervisor's spot-check report and the merchandiser's
 * before/after shelf state: the first photo must come straight from the
 * camera (not the gallery), and any additional photos can come from either.
 */
export default function PhotoNoteStep({
  labels,
  photos,
  onPhotosChange,
  note,
  onNoteChange,
  busy,
  onContinue,
}: PhotoNoteStepProps) {
  const [uploading, setUploading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoFile = async (file: File) => {
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

  const handleCameraCapture = (file: File) => {
    setCameraOpen(false);
    handlePhotoFile(file);
  };

  const removePhoto = (idx: number) => onPhotosChange(photos.filter((_, i) => i !== idx));

  const canContinue = photos.length > 0;

  return (
    <>
      {/* Photos — the first one must come straight from the camera, not the gallery */}
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
            <button
              type="button"
              className="sf-add-photo-btn"
              onClick={() => galleryInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? labels.uploading : `+ ${labels.addPhoto}`}
            </button>
          </>
        )}

        {/* Additional photos: lets the device offer camera or gallery */}
        <input
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          ref={galleryInputRef}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoFile(f); e.target.value = ''; }}
        />
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

      <div className="mf-sticky-footer">
        <button
          className="btn btn-primary btn-lg mf-full-btn"
          disabled={!canContinue || busy}
          onClick={onContinue}
        >
          {busy ? <span className="btn-spinner" /> : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              {labels.continueLabel}
            </>
          )}
        </button>
      </div>

      {cameraOpen && <CameraCapture onCapture={handleCameraCapture} onClose={() => setCameraOpen(false)} />}
    </>
  );
}
