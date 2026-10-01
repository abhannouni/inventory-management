import {
  Place,
  PlaceContext,
  TimedPlace,
  checkPoint,
  placesAt,
  sessionVerdict,
  verdictCounts,
  visitWindow,
} from './attendance.util';

// Two points ~5 km apart in Casablanca.
const AGENCY: Place = {
  kind: 'work_location',
  id: 'agency',
  name: 'Agency',
  lat: 33.5731,
  lng: -7.5898,
  radius_meters: 150,
};
const STORE = { lat: 33.5912, lng: -7.6386 };
const NEAR_STORE = { lat: 33.5915, lng: -7.6386 }; // ~33 m away
const HOME = { lat: 33.53, lng: -7.65 };

const at = (hh: number, mm = 0) => new Date(2026, 8, 30, hh, mm);
const now = at(20);

const storeVisit = (from: Date, to: Date): TimedPlace => ({
  kind: 'visit_store',
  id: 'store',
  name: 'Store',
  ...STORE,
  radius_meters: 150,
  visit_id: 'v1',
  from,
  to,
});

describe('attendance util', () => {
  describe('visitWindow', () => {
    it('spans a performed visit plus the margin on each side', () => {
      const w = visitWindow(
        {
          checkin_time: at(10),
          checkout_time: at(11),
          planned_date: '2026-09-30',
          planned_time: '09:00',
        },
        'visit_period',
        30,
        now,
      );
      expect(w).toEqual({ from: at(9, 30), to: at(11, 30) });
    });

    it('uses the planned hour while the visit has not started', () => {
      const w = visitWindow(
        {
          checkin_time: null,
          checkout_time: null,
          planned_date: '2026-09-30',
          planned_time: '09:00',
        },
        'visit_period',
        15,
        now,
      );
      expect(w).toEqual({ from: at(8, 45), to: at(9, 15) });
    });

    it('runs an open visit until now', () => {
      const w = visitWindow(
        {
          checkin_time: at(14),
          checkout_time: null,
          planned_date: null,
          planned_time: null,
        },
        'visit_period',
        0,
        at(15),
      );
      expect(w).toEqual({ from: at(14), to: at(15) });
    });

    it('covers the whole day with the visit_day scope', () => {
      const w = visitWindow(
        {
          checkin_time: at(10),
          checkout_time: at(11),
          planned_date: null,
          planned_time: null,
        },
        'visit_day',
        30,
        now,
      );
      expect(w).toEqual({
        from: new Date(2026, 8, 30),
        to: new Date(2026, 9, 1),
      });
    });

    it('has no window for a visit with no day', () => {
      expect(
        visitWindow(
          {
            checkin_time: null,
            checkout_time: null,
            planned_date: null,
            planned_time: null,
          },
          'visit_period',
          30,
          now,
        ),
      ).toBeNull();
    });
  });

  describe('checkPoint', () => {
    it('accepts the store during its visit — no agency required', () => {
      const field: PlaceContext = {
        always: [],
        timed: [storeVisit(at(9, 30), at(11, 30))],
      };
      const check = checkPoint(NEAR_STORE, at(10), field);
      expect(check.status).toBe('at_location');
      expect(check.place?.kind).toBe('visit_store');
    });

    it('rejects the store outside its visit window', () => {
      const field: PlaceContext = {
        always: [],
        timed: [storeVisit(at(9, 30), at(11, 30))],
      };
      expect(checkPoint(NEAR_STORE, at(15), field)).toEqual({
        status: 'off_site',
        place: null,
      });
    });

    it('accepts either place for a hybrid policy, and reports the nearest when off site', () => {
      const hybrid: PlaceContext = {
        always: [AGENCY],
        timed: [storeVisit(at(9), at(12))],
      };
      expect(checkPoint(AGENCY, at(8), hybrid).status).toBe('at_location');
      expect(checkPoint(STORE, at(10), hybrid).place?.id).toBe('store');

      const away = checkPoint(HOME, at(10), hybrid);
      expect(away.status).toBe('off_site');
      expect(away.place?.id).toBeDefined();
      expect(away.place!.distance_meters).toBeGreaterThan(150);
    });

    it('requires the agency for an office policy, even at a store', () => {
      const office: PlaceContext = { always: [AGENCY], timed: [] };
      expect(checkPoint(STORE, at(10), office).status).toBe('off_site');
    });

    it('cannot check a missing position', () => {
      expect(
        checkPoint(null, at(10), { always: [AGENCY], timed: [] }).status,
      ).toBe('no_position');
    });

    it('lists only the places valid at that instant', () => {
      const ctx: PlaceContext = {
        always: [AGENCY],
        timed: [storeVisit(at(9), at(10))],
      };
      expect(placesAt(ctx, at(9, 30)).map((p) => p.id)).toEqual([
        'agency',
        'store',
      ]);
      expect(placesAt(ctx, at(10)).map((p) => p.id)).toEqual(['agency']);
    });
  });

  describe('sessionVerdict & counting', () => {
    const ok = { status: 'at_location' as const, place: null };
    const off = { status: 'off_site' as const, place: null };
    const none = { status: 'no_position' as const, place: null };

    it('classifies sessions', () => {
      expect(sessionVerdict(false, false, [off])).toBe('not_checked');
      expect(sessionVerdict(true, true, [])).toBe('manual');
      expect(sessionVerdict(true, false, [ok, off])).toBe('off_site');
      expect(sessionVerdict(true, false, [ok, none])).toBe('verified');
      expect(sessionVerdict(true, false, [none])).toBe('unverified');
    });

    it('counts per the policy', () => {
      const strict = { count_off_site: false, count_unverified: false };
      expect(verdictCounts('verified', strict)).toBe(true);
      expect(verdictCounts('manual', strict)).toBe(true);
      expect(verdictCounts('off_site', strict)).toBe(false);
      expect(verdictCounts('unverified', strict)).toBe(false);
      expect(
        verdictCounts('unverified', { ...strict, count_unverified: true }),
      ).toBe(true);
    });
  });
});
