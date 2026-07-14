const DATE_LOCALES: Record<string, string> = { fr: 'fr-FR', en: 'en-US', ar: 'ar-MA' };

export function formatDate(dateStr: string, language: string = 'fr'): string {
  return new Date(dateStr).toLocaleDateString(DATE_LOCALES[language] || 'fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Elapsed seconds as a running clock: 0:42, 12:05, 1:03:47. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
}

/** Compact, human-readable duration for tables and reports: "1h 04m", "12m", "45s". */
export function formatDurationShort(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null) return '—';
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);

  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${s}s`;
}

/**
 * A calendar date with no time — for fields that are dates, not instants
 * (an opening date, a birthday). Showing "1 Jul 2021, 01:00" for a date-only
 * column exposes the storage timezone and reads as a bug.
 */
export function formatDateOnly(dateStr: string, language: string = 'fr'): string {
  return new Date(dateStr).toLocaleDateString(DATE_LOCALES[language] || 'fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatRole(role: string): string {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
