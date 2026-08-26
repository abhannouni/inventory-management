export const DATE_LOCALES: Record<string, string> = { fr: 'fr-FR', en: 'en-US', ar: 'ar-MA' };

/**
 * The calendar day of a date coming off the API.
 *
 * A Prisma `@db.Date` still serializes as a full ISO timestamp
 * (`2026-09-09T00:00:00.000Z`), so it has to be cut back to `YYYY-MM-DD` before
 * being parsed — appending a time to the whole string yields an invalid date,
 * and parsing the timestamp directly lands on the previous day west of UTC.
 */
export function apiDayString(apiDate: string) {
  return apiDate.slice(0, 10);
}

/** The same day as a local `Date`, safe to compare with `sameDay`. */
export function parseApiDay(apiDate: string) {
  return new Date(`${apiDayString(apiDate)}T00:00:00`);
}

export function toYYYYMM(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function toYYYYMMDD(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Monday=0 .. Sunday=6, matching the Monday-first grid/weekday labels used throughout. */
export function weekdayIndexMonFirst(d: Date) {
  return (d.getDay() + 6) % 7;
}

export function sameDay(a: Date, b: Date) {
  return a.getDate() === b.getDate()
    && a.getMonth() === b.getMonth()
    && a.getFullYear() === b.getFullYear();
}

/** 42-cell Monday-first month grid, including leading/trailing days from adjacent months. */
export function buildCalendarDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // Mon = 0
  const lastDate = new Date(year, month + 1, 0).getDate();
  const days: Date[] = [];

  for (let i = startOffset; i > 0; i--) days.push(new Date(year, month, 1 - i));
  for (let d = 1; d <= lastDate; d++) days.push(new Date(year, month, d));
  while (days.length < 42) days.push(new Date(year, month + 1, days.length - startOffset - lastDate + 1));
  return days;
}

/** Just the days that belong to the given month — for an agenda/list layout. */
export function buildMonthDays(year: number, month: number): Date[] {
  const lastDate = new Date(year, month + 1, 0).getDate();
  const days: Date[] = [];
  for (let d = 1; d <= lastDate; d++) days.push(new Date(year, month, d));
  return days;
}

export function formatDayHeading(d: Date, language: string = 'fr') {
  return d.toLocaleDateString(DATE_LOCALES[language] || 'fr-FR', { weekday: 'long', month: 'long', day: 'numeric' });
}

export function formatDayShort(d: Date, language: string = 'fr') {
  return d.toLocaleDateString(DATE_LOCALES[language] || 'fr-FR', { weekday: 'short', day: 'numeric' });
}
