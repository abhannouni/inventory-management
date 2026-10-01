import {
  MAX_SESSION_SECONDS,
  ScheduleVersion,
  WeekDays,
  addDays,
  atTime,
  dayMinutes,
  dayStatus,
  eachDateKey,
  normalizeDays,
  overlapSeconds,
  parseDateKey,
  resolveSchedule,
  versionAsOf,
  weekMinutes,
  weekStart,
  weekdayIndex,
} from './work-hours.util';

const nineToSix = { start: '09:00', end: '18:00', break_minutes: 60 };
const week = (day: typeof nineToSix | null): WeekDays => [
  day,
  day,
  day,
  day,
  day,
  null,
  null,
];

const version = (
  id: string,
  effective_from: string,
  days: WeekDays | null,
  at = 0,
): ScheduleVersion => ({
  id,
  effective_from,
  days,
  created_at: new Date(2026, 0, 1, 0, 0, at),
});

describe('work-hours util', () => {
  describe('dates', () => {
    it('numbers weekdays Monday first', () => {
      expect(weekdayIndex(parseDateKey('2026-09-28'))).toBe(0); // Monday
      expect(weekdayIndex(parseDateKey('2026-10-04'))).toBe(6); // Sunday
    });

    it('finds the Monday of a week and walks ranges across months', () => {
      expect(weekStart('2026-10-01')).toBe('2026-09-28');
      expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
      expect(eachDateKey('2026-09-29', '2026-10-02')).toEqual([
        '2026-09-29',
        '2026-09-30',
        '2026-10-01',
        '2026-10-02',
      ]);
    });
  });

  describe('schedules', () => {
    it('counts a day as its span minus the break', () => {
      expect(dayMinutes(nineToSix)).toBe(8 * 60);
      expect(dayMinutes(null)).toBe(0);
      expect(weekMinutes(week(nineToSix))).toBe(40 * 60);
    });

    it('validates a week payload', () => {
      expect(normalizeDays(week(nineToSix))).toHaveLength(7);
      expect(() => normalizeDays([nineToSix])).toThrow();
      expect(() =>
        normalizeDays(week({ start: '18:00', end: '09:00', break_minutes: 0 })),
      ).toThrow();
      expect(() =>
        normalizeDays(
          week({ start: '09:00', end: '10:00', break_minutes: 60 }),
        ),
      ).toThrow();
      expect(() =>
        normalizeDays(week({ start: '9:00', end: '18:00', break_minutes: 0 })),
      ).toThrow();
    });

    it('picks the latest version in force, later writes winning on the same day', () => {
      const versions = [
        version('a', '2026-09-01', null),
        version('b', '2026-09-15', null),
        version('c', '2026-09-15', null, 5),
        version('d', '2026-10-01', null),
      ];
      expect(versionAsOf(versions, '2026-08-31')).toBeNull();
      expect(versionAsOf(versions, '2026-09-10')?.id).toBe('a');
      expect(versionAsOf(versions, '2026-09-20')?.id).toBe('c');
      expect(versionAsOf(versions, '2026-10-01')?.id).toBe('d');
    });

    it('lets a personal schedule override the role default, and null revert to it', () => {
      const role = [version('r', '2026-01-01', week(nineToSix))];
      const custom = week({ start: '08:00', end: '12:00', break_minutes: 0 });

      expect(resolveSchedule([], role, '2026-09-30').source).toBe('role');
      expect(
        resolveSchedule(
          [version('u', '2026-09-01', custom)],
          role,
          '2026-09-30',
        ),
      ).toEqual({ days: custom, source: 'custom' });
      expect(
        resolveSchedule(
          [
            version('u', '2026-09-01', custom),
            version('u2', '2026-09-20', null),
          ],
          role,
          '2026-09-30',
        ).source,
      ).toBe('role');
      expect(
        resolveSchedule(
          [version('u', '2026-09-01', week(null))],
          role,
          '2026-09-30',
        ).source,
      ).toBe('none');
      expect(resolveSchedule([], [], '2026-09-30')).toEqual({
        days: null,
        source: 'none',
      });
    });
  });

  describe('time tracking', () => {
    const day = '2026-09-30';
    const start = parseDateKey(day);
    const end = parseDateKey(addDays(day, 1));

    it('clips sessions to the day and counts open ones up to now', () => {
      const now = atTime(day, '12:00');
      expect(
        overlapSeconds(
          { clock_in: atTime(day, '09:00'), clock_out: atTime(day, '11:00') },
          start,
          end,
          now,
        ),
      ).toBe(7200);
      expect(
        overlapSeconds(
          { clock_in: atTime(day, '10:00'), clock_out: null },
          start,
          end,
          now,
        ),
      ).toBe(7200);
      // Crossing midnight: only the part on this day counts.
      const overnight = {
        clock_in: atTime(addDays(day, -1), '22:00'),
        clock_out: atTime(day, '02:00'),
      };
      expect(overlapSeconds(overnight, start, end, now)).toBe(7200);
    });

    it('stops counting a forgotten clock-out at the cap', () => {
      const clockIn = atTime(addDays(day, -2), '09:00');
      const now = atTime(day, '12:00');
      const counted = overlapSeconds(
        { clock_in: clockIn, clock_out: null },
        new Date(0),
        now,
        now,
      );
      expect(counted).toBe(MAX_SESSION_SECONDS);
    });
  });

  describe('dayStatus', () => {
    const assigned = 8 * 3600;
    const shiftEnd = new Date(2026, 8, 30, 18, 0);
    const after = new Date(2026, 8, 30, 20, 0);
    const during = new Date(2026, 8, 30, 14, 0);
    const base = {
      assignedSeconds: assigned,
      isWorking: false,
      shiftEnd,
      now: after,
    };

    it('is green once the assigned hours are done', () => {
      expect(dayStatus({ ...base, workedSeconds: assigned })).toBe('completed');
      expect(
        dayStatus({ ...base, workedSeconds: assigned + 600, now: during }),
      ).toBe('completed');
    });

    it('is orange up to 15 minutes short, red beyond', () => {
      expect(dayStatus({ ...base, workedSeconds: assigned - 15 * 60 })).toBe(
        'short',
      );
      expect(
        dayStatus({ ...base, workedSeconds: assigned - 15 * 60 - 1 }),
      ).toBe('missing');
      expect(dayStatus({ ...base, workedSeconds: 0 })).toBe('missing');
    });

    it('is blue while clocked in or while the shift is still running', () => {
      expect(dayStatus({ ...base, workedSeconds: 3600, isWorking: true })).toBe(
        'in_progress',
      );
      expect(dayStatus({ ...base, workedSeconds: 3600, now: during })).toBe(
        'in_progress',
      );
    });

    it('is gray with no schedule, or before any time is recorded mid-shift', () => {
      expect(
        dayStatus({
          ...base,
          assignedSeconds: 0,
          workedSeconds: 3600,
          shiftEnd: null,
        }),
      ).toBe('no_schedule');
      expect(dayStatus({ ...base, workedSeconds: 0, now: during })).toBe(
        'not_started',
      );
    });
  });
});
