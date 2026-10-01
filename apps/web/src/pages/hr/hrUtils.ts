import type { TFunction } from 'i18next';
import type { HrEmployee, ScheduleDay, WeekDays, WorkStatus } from '../../api/hr.api';

export const DAYS_PER_WEEK = 7;

/** Status → colour family. The one place the colour code is defined. */
export const STATUS_TONE: Record<WorkStatus, 'green' | 'orange' | 'red' | 'blue' | 'gray'> = {
  completed: 'green',
  short: 'orange',
  missing: 'red',
  in_progress: 'blue',
  not_started: 'gray',
  no_schedule: 'gray',
};

/** Legend / filter order. */
export const STATUS_ORDER: WorkStatus[] = ['completed', 'short', 'missing', 'in_progress', 'not_started', 'no_schedule'];

export const BREAK_OPTIONS = [0, 15, 30, 45, 60, 90, 120];

export const emptyWeek = (): WeekDays => Array.from({ length: DAYS_PER_WEEK }, () => null);

export const STANDARD_DAY: ScheduleDay = { start: '09:00', end: '18:00', break_minutes: 60 };

/** Monday–Friday at the standard hours — the starting point when nothing else applies. */
export const standardWeek = (): WeekDays => [0, 1, 2, 3, 4, 5, 6].map((i) => (i < 5 ? { ...STANDARD_DAY } : null));

export const copyWeek = (days: WeekDays): WeekDays => days.map((d) => (d ? { ...d } : null));

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function dayMinutes(day: ScheduleDay | null | undefined): number {
  if (!day) return 0;
  return Math.max(0, toMinutes(day.end) - toMinutes(day.start) - day.break_minutes);
}

export function weekMinutes(days: WeekDays | null | undefined): number {
  return (days ?? []).reduce((sum, d) => sum + dayMinutes(d), 0);
}

/** Problem with one day's hours, or null when it's valid. */
export function dayError(day: ScheduleDay | null, t: TFunction): string | null {
  if (!day) return null;
  if (!day.start || !day.end) return t('editor.errors.required');
  const span = toMinutes(day.end) - toMinutes(day.start);
  if (span <= 0) return t('editor.errors.endBeforeStart');
  if (day.break_minutes >= span) return t('editor.errors.breakTooLong');
  return null;
}

/** Every working day has a start before its end and a break shorter than the shift. */
export function weekIsValid(days: WeekDays): boolean {
  return days.every((d) => {
    if (!d) return true;
    if (!d.start || !d.end) return false;
    const span = toMinutes(d.end) - toMinutes(d.start);
    return span > 0 && d.break_minutes < span;
  });
}

/** "7h30", "8h", "45m", "0h" — compact hours for tables. */
export function formatHours(seconds: number | null | undefined): string {
  const total = Math.max(0, Math.round((seconds ?? 0) / 60));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return m === 0 ? '0h' : `${m}m`;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}

export const formatMinutes = (minutes: number) => formatHours(minutes * 60);

const DATE_LOCALES: Record<string, string> = { fr: 'fr-FR', en: 'en-US', ar: 'ar-MA' };
export const dateLocale = (language: string) => DATE_LOCALES[language] ?? 'fr-FR';

/** `YYYY-MM-DD` in the browser's local time. */
export function toDateKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, days: number): string {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

/** Monday of the week containing `key`. */
export function weekStart(key: string): string {
  return addDays(key, -((parseDateKey(key).getDay() + 6) % 7));
}

export function todayKey(): string {
  return toDateKey(new Date());
}

/** Localised weekday names, Monday first. */
export function weekdayNames(language: string, style: 'long' | 'short' | 'narrow' = 'long'): string[] {
  const monday = new Date(2024, 0, 1); // a Monday
  return Array.from({ length: DAYS_PER_WEEK }, (_, i) =>
    new Date(monday.getFullYear(), 0, 1 + i).toLocaleDateString(dateLocale(language), { weekday: style }),
  );
}

export function formatDay(key: string, language: string, opts: Intl.DateTimeFormatOptions = {}): string {
  return parseDateKey(key).toLocaleDateString(dateLocale(language), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...opts,
  });
}

export function formatTime(iso: string | null | undefined, language: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString(dateLocale(language), { hour: '2-digit', minute: '2-digit' });
}

export function formatShift(day: ScheduleDay | null, t: TFunction): string {
  if (!day) return t('schedule.dayOff');
  const base = `${day.start}–${day.end}`;
  return day.break_minutes ? `${base} · ${t('schedule.breakShort', { minutes: day.break_minutes })}` : base;
}

/** Built-in roles are translated; custom roles show their own label. */
export function roleLabel(e: Pick<HrEmployee, 'role_is_system' | 'role_name' | 'role_label'>, tCommon: TFunction): string {
  return e.role_is_system ? tCommon(`roles.${e.role_name}`, { defaultValue: e.role_label }) : e.role_label;
}

export function roleLabelOf(r: { is_system: boolean; name: string; label: string }, tCommon: TFunction): string {
  return r.is_system ? tCommon(`roles.${r.name}`, { defaultValue: r.label }) : r.label;
}

/** `datetime-local` input value for an ISO instant, in local time. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${toDateKey(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
