import { haversineDistanceMeters } from '../visits/visits.service';
import {
  MAX_SESSION_SECONDS,
  addDays,
  atTime,
  parseDateKey,
  toDateKey,
} from './work-hours.util';

/**
 * Pure rules behind location-checked working hours — no Prisma, no clock of
 * their own (`now` is passed in), so they are unit-testable.
 *
 * Working time is always the time an employee clocked (work sessions). Visits
 * never add hours: they only decide *where* someone may legitimately be while
 * clocked in, when their attendance policy lets a visit's store count.
 */

export type PlaceKind = 'work_location' | 'visit_store' | 'assigned_store';

export interface Place {
  kind: PlaceKind;
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius_meters: number;
}

/** A place that is only valid inside `[from, to)` — a visit's store. */
export interface TimedPlace extends Place {
  from: Date;
  to: Date;
  visit_id: string;
}

/** Every place an employee's policy accepts, resolved for the period at hand. */
export interface PlaceContext {
  /** Valid at any time: their work locations and assigned stores. */
  always: Place[];
  /** Valid only around a visit. */
  timed: TimedPlace[];
}

export interface Position {
  lat: number;
  lng: number;
}

export type PointStatus = 'at_location' | 'off_site' | 'no_position';

export interface PointCheck {
  status: PointStatus;
  /** The place matched — or, when off site, the nearest valid one (null if none was valid then). */
  place: {
    kind: PlaceKind;
    id: string;
    name: string;
    distance_meters: number;
  } | null;
}

/**
 * How a session counts:
 *   `verified`    — clocked at a valid place
 *   `off_site`    — clocked away from every place valid at that moment
 *   `unverified`  — no position was recorded
 *   `manual`      — entered by HR, who vouch for it
 *   `not_checked` — the employee's time isn't location-checked
 */
export type SessionVerdict =
  | 'verified'
  | 'off_site'
  | 'unverified'
  | 'manual'
  | 'not_checked';

export interface CountingRules {
  count_off_site: boolean;
  count_unverified: boolean;
}

export type VisitScope = 'visit_period' | 'visit_day';

export interface VisitTimes {
  checkin_time: Date | null;
  checkout_time: Date | null;
  /** `YYYY-MM-DD`. */
  planned_date: string | null;
  /** `HH:mm`. */
  planned_time: string | null;
}

/**
 * When a visit's store is a valid workplace.
 *
 * `visit_day`: the whole calendar day of the visit (performed, else planned).
 * `visit_period`: from `margin` before the visit to `margin` after it — the
 * actual check-in/out when it happened, else the planned hour. An open visit
 * runs until now, capped like a forgotten clock-out. A planned visit with no
 * hour (legacy rows) falls back to its whole day.
 */
export function visitWindow(
  visit: VisitTimes,
  scope: VisitScope,
  marginMinutes: number,
  now: Date,
): { from: Date; to: Date } | null {
  const day = visit.checkin_time
    ? toDateKey(visit.checkin_time)
    : visit.planned_date;
  if (!day) return null;
  const wholeDay = {
    from: parseDateKey(day),
    to: parseDateKey(addDays(day, 1)),
  };
  if (scope === 'visit_day') return wholeDay;

  const margin = marginMinutes * 60 * 1000;
  if (visit.checkin_time) {
    const start = visit.checkin_time.getTime();
    const end = visit.checkout_time
      ? visit.checkout_time.getTime()
      : Math.min(
          Math.max(now.getTime(), start),
          start + MAX_SESSION_SECONDS * 1000,
        );
    return { from: new Date(start - margin), to: new Date(end + margin) };
  }
  if (!visit.planned_time) return wholeDay;
  const planned = atTime(day, visit.planned_time).getTime();
  return { from: new Date(planned - margin), to: new Date(planned + margin) };
}

/** Places valid at instant `at`. */
export function placesAt(ctx: PlaceContext, at: Date): Place[] {
  const t = at.getTime();
  return [
    ...ctx.always,
    ...ctx.timed.filter((p) => p.from.getTime() <= t && t < p.to.getTime()),
  ];
}

/** Is `position`, recorded at `at`, at one of the places valid then? */
export function checkPoint(
  position: Position | null,
  at: Date,
  ctx: PlaceContext,
): PointCheck {
  if (!position) return { status: 'no_position', place: null };

  let match: PointCheck['place'] = null;
  let nearest: PointCheck['place'] = null;
  for (const p of placesAt(ctx, at)) {
    const distance = Math.round(
      haversineDistanceMeters(position.lat, position.lng, p.lat, p.lng),
    );
    const entry = {
      kind: p.kind,
      id: p.id,
      name: p.name,
      distance_meters: distance,
    };
    if (
      distance <= p.radius_meters &&
      (!match || distance < match.distance_meters)
    )
      match = entry;
    if (!nearest || distance < nearest.distance_meters) nearest = entry;
  }
  return match
    ? { status: 'at_location', place: match }
    : { status: 'off_site', place: nearest };
}

/**
 * One verdict per session from its clock-in/out checks. Any check away from
 * every valid place makes the session off site; otherwise one confirmed
 * position is enough (a clock-out with no position — an auto-closed or
 * still-open session — doesn't undo a verified clock-in).
 */
export function sessionVerdict(
  checked: boolean,
  manual: boolean,
  checks: PointCheck[],
): SessionVerdict {
  if (!checked) return 'not_checked';
  if (manual) return 'manual';
  if (checks.some((c) => c.status === 'off_site')) return 'off_site';
  if (checks.some((c) => c.status === 'at_location')) return 'verified';
  return 'unverified';
}

/** Whether a session with this verdict counts toward working hours. */
export function verdictCounts(
  verdict: SessionVerdict,
  rules: CountingRules,
): boolean {
  if (verdict === 'off_site') return rules.count_off_site;
  if (verdict === 'unverified') return rules.count_unverified;
  return true;
}
