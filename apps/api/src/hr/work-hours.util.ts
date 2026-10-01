import { BadRequestException } from '@nestjs/common';

/**
 * Pure helpers behind working-hours tracking — no Prisma, no clock of their
 * own (`now` is always passed in), so the status rules are unit-testable.
 *
 * Calendar days follow the server's local time, the same convention the visit
 * flow uses for "today" (see VisitsService.todayBounds). Schedule times are
 * `HH:mm` wall-clock strings for the same reason visit planned times are:
 * "09:00" must not shift with a timezone.
 */

export const DAYS_PER_WEEK = 7;

/** Up to this far below the assigned hours counts as "slightly short" (orange). */
export const SHORT_TOLERANCE_SECONDS = 15 * 60;

/**
 * An open session stops counting after this long. A forgotten clock-out would
 * otherwise keep adding hours for days; the day is flagged for review instead.
 */
export const MAX_SESSION_SECONDS = 16 * 3600;

/** Longest range the employee detail view may request in one go. */
export const MAX_RANGE_DAYS = 62;

export interface ScheduleDay {
  start: string;
  end: string;
  break_minutes: number;
}

/** Seven entries, Monday first; null = day off. */
export type WeekDays = (ScheduleDay | null)[];

export type ScheduleSource = 'custom' | 'role' | 'none';

export type WorkStatus =
  | 'completed'
  | 'short'
  | 'missing'
  | 'in_progress'
  | 'not_started'
  | 'no_schedule';

/** Most urgent first — the default sort of the tracking table. */
export const STATUS_SEVERITY: WorkStatus[] = [
  'missing',
  'short',
  'in_progress',
  'not_started',
  'completed',
  'no_schedule',
];

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ─── Times & dates ─────────────────────────────────────────────────────────────

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function dayMinutes(day: ScheduleDay | null | undefined): number {
  if (!day) return 0;
  return Math.max(
    0,
    toMinutes(day.end) - toMinutes(day.start) - day.break_minutes,
  );
}

export function weekMinutes(days: WeekDays | null): number {
  return (days ?? []).reduce((sum, d) => sum + dayMinutes(d), 0);
}

/** Monday = 0 … Sunday = 6, for a local calendar date. */
export function weekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/** `YYYY-MM-DD` of a Date in server-local time. */
export function toDateKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function assertDateKey(value: string, field = 'date'): string {
  if (!DATE_RE.test(value) || Number.isNaN(parseDateKey(value).getTime())) {
    throw new BadRequestException(
      `${field} must be a date formatted YYYY-MM-DD`,
    );
  }
  return value;
}

/** Local midnight at the start of a `YYYY-MM-DD` day. */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, days: number): string {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

/** Every `YYYY-MM-DD` from `from` to `to`, inclusive. */
export function eachDateKey(from: string, to: string): string[] {
  const keys: string[] = [];
  for (let k = from; k <= to; k = addDays(k, 1)) keys.push(k);
  return keys;
}

/** Monday of the week containing `key`. */
export function weekStart(key: string): string {
  return addDays(key, -weekdayIndex(parseDateKey(key)));
}

/**
 * A `@db.Date` column value for a calendar day. Prisma stores DATE columns as
 * UTC midnight, so the key is encoded the same way (as VisitPlansService does).
 */
export function toDbDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function fromDbDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Local wall-clock `HH:mm` on the day `key`, as an instant. */
export function atTime(key: string, hhmm: string): Date {
  const date = parseDateKey(key);
  const minutes = toMinutes(hhmm);
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return date;
}

// ─── Schedule validation & resolution ──────────────────────────────────────────

/**
 * Validates a `days` payload into a clean week. Done here rather than with
 * class-validator because the array legitimately holds nulls (days off),
 * which `@ValidateNested` rejects.
 */
export function normalizeDays(raw: unknown): WeekDays {
  if (!Array.isArray(raw) || raw.length !== DAYS_PER_WEEK) {
    throw new BadRequestException(
      `days must list exactly ${DAYS_PER_WEEK} entries, Monday first`,
    );
  }
  return raw.map((entry, i) => {
    if (entry === null || entry === undefined) return null;
    if (typeof entry !== 'object') {
      throw new BadRequestException(`days[${i}] must be an object or null`);
    }
    const { start, end, break_minutes } = entry as Record<string, unknown>;
    if (typeof start !== 'string' || !TIME_RE.test(start)) {
      throw new BadRequestException(
        `days[${i}].start must be a time formatted HH:mm`,
      );
    }
    if (typeof end !== 'string' || !TIME_RE.test(end)) {
      throw new BadRequestException(
        `days[${i}].end must be a time formatted HH:mm`,
      );
    }
    const span = toMinutes(end) - toMinutes(start);
    if (span <= 0) {
      throw new BadRequestException(
        `days[${i}]: the end time must be after the start time`,
      );
    }
    const breakMinutes =
      break_minutes === undefined || break_minutes === null
        ? 0
        : Number(break_minutes);
    if (
      !Number.isInteger(breakMinutes) ||
      breakMinutes < 0 ||
      breakMinutes >= span
    ) {
      throw new BadRequestException(
        `days[${i}].break_minutes must be a whole number shorter than the shift`,
      );
    }
    return { start, end, break_minutes: breakMinutes };
  });
}

/** Parses a stored `days` JSON value; anything malformed reads as "no schedule". */
export function readDays(value: unknown): WeekDays | null {
  if (!Array.isArray(value) || value.length !== DAYS_PER_WEEK) return null;
  return value as WeekDays;
}

export interface ScheduleVersion {
  id: string;
  days: WeekDays | null;
  /** `YYYY-MM-DD`. */
  effective_from: string;
  created_at: Date;
}

/** The version in force on `key`: latest effective date, then latest written. */
export function versionAsOf<T extends ScheduleVersion>(
  versions: T[],
  key: string,
): T | null {
  let best: T | null = null;
  for (const v of versions) {
    if (v.effective_from > key) continue;
    if (
      !best ||
      v.effective_from > best.effective_from ||
      (v.effective_from === best.effective_from &&
        v.created_at > best.created_at)
    ) {
      best = v;
    }
  }
  return best;
}

export interface ResolvedSchedule {
  days: WeekDays | null;
  source: ScheduleSource;
}

/**
 * A personal schedule wins; a personal version with `days = null` means
 * "follow my role" and falls through to the role default.
 */
export function resolveSchedule(
  userVersions: ScheduleVersion[],
  roleVersions: ScheduleVersion[],
  key: string,
): ResolvedSchedule {
  const own = versionAsOf(userVersions, key);
  if (own?.days) {
    return {
      days: own.days,
      source: weekMinutes(own.days) > 0 ? 'custom' : 'none',
    };
  }
  const role = versionAsOf(roleVersions, key);
  if (role?.days && weekMinutes(role.days) > 0)
    return { days: role.days, source: 'role' };
  return { days: null, source: 'none' };
}

// ─── Time tracking ─────────────────────────────────────────────────────────────

export interface SessionLike {
  clock_in: Date;
  clock_out: Date | null;
}

/** When an open session stops counting: now, or the cap for a forgotten clock-out. */
export function effectiveEnd(session: SessionLike, now: Date): Date {
  if (session.clock_out) return session.clock_out;
  const cap = session.clock_in.getTime() + MAX_SESSION_SECONDS * 1000;
  return new Date(Math.min(now.getTime(), cap));
}

/** An open session that has run past the cap — its clock-out was forgotten. */
export function isStale(session: SessionLike, now: Date): boolean {
  return (
    !session.clock_out &&
    now.getTime() - session.clock_in.getTime() > MAX_SESSION_SECONDS * 1000
  );
}

/** Seconds of `session` falling inside `[start, end)`. */
export function overlapSeconds(
  session: SessionLike,
  start: Date,
  end: Date,
  now: Date,
): number {
  const from = Math.max(session.clock_in.getTime(), start.getTime());
  const to = Math.min(effectiveEnd(session, now).getTime(), end.getTime());
  return Math.max(0, Math.floor((to - from) / 1000));
}

export interface DayStatusInput {
  assignedSeconds: number;
  workedSeconds: number;
  /** Clocked in right now. */
  isWorking: boolean;
  /** When the scheduled shift ends; null when nothing is scheduled. */
  shiftEnd: Date | null;
  now: Date;
}

/**
 * The colour-coded status of one employee-day:
 *   green  `completed`   — worked at least the assigned hours
 *   orange `short`       — up to 15 minutes below them
 *   red    `missing`     — more than 15 minutes below them
 *   blue   `in_progress` — clocked in now, or the shift is still running
 *   gray   `not_started` — the shift hasn't ended and no time is recorded yet
 *   gray   `no_schedule` — nothing assigned for that day
 *
 * A day is only judged short/missing once its shift is over — mid-afternoon,
 * someone halfway through their day is on track, not missing hours.
 */
export function dayStatus({
  assignedSeconds,
  workedSeconds,
  isWorking,
  shiftEnd,
  now,
}: DayStatusInput): WorkStatus {
  if (isWorking) return 'in_progress';
  if (assignedSeconds <= 0) return 'no_schedule';
  if (workedSeconds >= assignedSeconds) return 'completed';
  if (shiftEnd && now < shiftEnd)
    return workedSeconds > 0 ? 'in_progress' : 'not_started';
  return assignedSeconds - workedSeconds <= SHORT_TOLERANCE_SECONDS
    ? 'short'
    : 'missing';
}
