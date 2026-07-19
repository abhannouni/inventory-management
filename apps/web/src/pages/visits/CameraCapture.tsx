import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

/** Camera warm-up + auto-exposure calibration time before the shutter arms. */
const SETTLE_DELAY_MS = 700;
/** How many times to silently retry a capture that comes back blank. Mobile
 *  rear cameras can take noticeably longer than a laptop webcam to finish
 *  auto-exposure/focus, so this budget (up to ~4.5s) is generous on purpose. */
const MAX_RETRIES = 15;
const RETRY_DELAY_MS = 300;

/**
 * A real photo has some contrast; a camera still calibrating exposure hands
 * back a uniformly bright/blank frame. Sample a small grid of pixels rather
 * than the whole frame — cheap, and enough to catch that case without
 * false-positiving on a genuinely bright, low-contrast subject.
 */
function looksBlank(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  const gridSize = 5;
  let min = 255;
  let max = 0;
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const x = Math.min(width - 1, Math.floor((width * (i + 0.5)) / gridSize));
      const y = Math.min(height - 1, Math.floor((height * (j + 0.5)) / gridSize));
      const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
      min = Math.min(min, r, g, b);
      max = Math.max(max, r, g, b);
    }
  }
  return min > 248 && max - min < 6;
}

/**
 * A live camera feed captured via getUserMedia, snapshotted to a File.
 * Used instead of `<input type="file">` for the required first photo: a plain
 * file input's `capture` attribute is only honored by mobile browsers (it opens
 * the OS camera app there), but is silently ignored on desktop, where it just
 * opens the normal file/gallery picker. Driving the camera directly through
 * getUserMedia works the same way on both laptop and phone.
 */
export default function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const { t } = useTranslation('visits');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;

    if (!navigator.mediaDevices?.getUserMedia) {
      setError(t('supervisorFlow.report.camera.unsupported'));
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((tr) => tr.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => { if (!cancelled) setError(t('supervisorFlow.report.camera.accessDenied')); });

    return () => {
      cancelled = true;
      clearTimeout(settleTimer);
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
    };
  }, [t]);

  const handleLoadedData = () => {
    // Don't arm the shutter the instant a frame decodes — real camera hardware
    // is still finishing auto-exposure/white-balance calibration at that point,
    // so an immediate capture frequently comes back blank/overexposed (a solid
    // white photo). Give it a beat to settle.
    setTimeout(() => setReady(true), SETTLE_DELAY_MS);
  };

  const attemptCapture = (attemptsLeft: number) => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || video.readyState < video.HAVE_CURRENT_DATA) { setCapturing(false); return; }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) { setCapturing(false); return; }
    ctx.drawImage(video, 0, 0);

    if (attemptsLeft > 0 && looksBlank(ctx, canvas.width, canvas.height)) {
      setTimeout(() => attemptCapture(attemptsLeft - 1), RETRY_DELAY_MS);
      return;
    }

    canvas.toBlob((blob) => {
      setCapturing(false);
      if (!blob) return;
      onCapture(new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.9);
  };

  const capture = () => {
    setCapturing(true);
    attemptCapture(MAX_RETRIES);
  };

  return (
    <div className="sf-camera-overlay">
      <div className="sf-camera-frame">
        {error ? (
          <div className="sf-camera-error">{error}</div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="sf-camera-video"
            onLoadedData={handleLoadedData}
          />
        )}
      </div>
      <div className="sf-camera-actions">
        <button type="button" className="sf-camera-cancel" onClick={onClose}>
          {t('supervisorFlow.report.camera.cancel')}
        </button>
        {!error && (
          <button
            type="button"
            className="sf-camera-shutter"
            onClick={capture}
            disabled={!ready || capturing}
            aria-label={t('supervisorFlow.report.camera.capture')}
          />
        )}
      </div>
    </div>
  );
}
