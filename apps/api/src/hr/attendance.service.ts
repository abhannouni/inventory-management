import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  User,
  UserRole,
  VisitStatus,
  WorkSessionSource,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CountingRules,
  PlaceContext,
  PointCheck,
  SessionVerdict,
  TimedPlace,
  checkPoint,
  sessionVerdict,
  verdictCounts,
  visitWindow,
} from './attendance.util';
import {
  CreateWorkLocationDto,
  SetAttendancePolicyDto,
  UpdateWorkLocationDto,
} from './dto/attendance.dto';
import { RangeQueryDto } from './dto/range-query.dto';
import { WorkHoursService } from './work-hours.service';
import {
  MAX_SESSION_SECONDS,
  addDays,
  atTime,
  dayStatus,
  fromDbDate,
  overlapSeconds,
  parseDateKey,
  toDateKey,
  toDbDate,
} from './work-hours.util';

const POLICY_INCLUDE = {
  locations: {
    include: { location: true },
    orderBy: { location: { name: 'asc' } },
  },
  updated_by: { select: { id: true, full_name: true } },
} satisfies Prisma.AttendancePolicyInclude;

type PolicyRecord = Prisma.AttendancePolicyGetPayload<{
  include: typeof POLICY_INCLUDE;
}>;

/** What applies to an employee with no policy row: nothing is location-checked. */
const DEFAULT_POLICY = {
  enabled: false,
  allow_work_locations: true,
  allow_visit_stores: false,
  allow_assigned_stores: false,
  visit_scope: 'visit_period' as const,
  visit_margin_minutes: 30,
  store_radius_meters: 150,
  count_off_site: false,
  count_unverified: true,
};

const VERDICTS: SessionVerdict[] = [
  'verified',
  'off_site',
  'unverified',
  'manual',
  'not_checked',
];

/**
 * Location-checked working hours: the places each employee may work from
 * (their own attendance policy), and the "calculate working hours" report that
 * applies it.
 *
 * The report counts clocked time (work sessions) only. Visits are reported
 * beside it, never added to it — their only part in the hours is making a
 * store a valid workplace around the visit, when the policy says so.
 */
@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workHours: WorkHoursService,
  ) {}

  // ─── Work locations ──────────────────────────────────────────────────────

  async listLocations() {
    const rows = await this.prisma.workLocation.findMany({
      include: { _count: { select: { policies: true } } },
      orderBy: [{ is_active: 'desc' }, { name: 'asc' }],
    });
    return rows.map(({ _count, ...l }) => ({
      ...toLocation(l),
      employee_count: _count.policies,
    }));
  }

  async createLocation(dto: CreateWorkLocationDto, actor: User) {
    const [location] = await this.prisma.$transaction([
      this.prisma.workLocation.create({
        data: { ...dto, name: dto.name.trim() },
      }),
      this.audit(actor, 'create_work_location', 'work_location', null, dto),
    ]);
    return toLocation(location);
  }

  async updateLocation(id: string, dto: UpdateWorkLocationDto, actor: User) {
    const existing = await this.prisma.workLocation.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Work location not found');
    const [location] = await this.prisma.$transaction([
      this.prisma.workLocation.update({
        where: { id },
        data: { ...dto, ...(dto.name ? { name: dto.name.trim() } : {}) },
      }),
      this.audit(actor, 'update_work_location', 'work_location', id, {
        before: toLocation(existing),
        after: dto,
      }),
    ]);
    return toLocation(location);
  }

  /** Removing a location also takes it off every policy that listed it. */
  async removeLocation(id: string, actor: User) {
    const existing = await this.prisma.workLocation.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Work location not found');
    await this.prisma.$transaction([
      this.prisma.workLocation.delete({ where: { id } }),
      this.audit(
        actor,
        'delete_work_location',
        'work_location',
        id,
        toLocation(existing),
      ),
    ]);
  }

  // ─── Attendance policies ─────────────────────────────────────────────────

  async getPolicy(userId: string) {
    await this.assertEmployee(userId);
    const [policy, stores] = await Promise.all([
      this.prisma.attendancePolicy.findUnique({
        where: { user_id: userId },
        include: POLICY_INCLUDE,
      }),
      this.prisma.userStore.findMany({
        where: { user_id: userId },
        select: { store: { select: { latitude: true, longitude: true } } },
      }),
    ]);
    return {
      ...toPolicy(policy),
      assigned_stores: {
        total: stores.length,
        without_coordinates: stores.filter(
          (s) => s.store.latitude == null || s.store.longitude == null,
        ).length,
      },
    };
  }

  async setPolicy(userId: string, dto: SetAttendancePolicyDto, actor: User) {
    await this.assertEmployee(userId);

    const { work_location_ids, ...fields } = dto;
    const locationIds = Array.from(new Set(work_location_ids));
    if (dto.enabled) {
      if (
        !dto.allow_work_locations &&
        !dto.allow_visit_stores &&
        !dto.allow_assigned_stores
      ) {
        throw new BadRequestException(
          'Choose at least one kind of place where this employee may work',
        );
      }
      if (dto.allow_work_locations && !locationIds.length) {
        throw new BadRequestException('Select at least one work location');
      }
    }
    if (locationIds.length) {
      const found = await this.prisma.workLocation.count({
        where: { id: { in: locationIds } },
      });
      if (found !== locationIds.length)
        throw new NotFoundException(
          'A selected work location no longer exists',
        );
    }

    const data = { ...fields, updated_by_id: actor.id };

    const policy = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.attendancePolicy.upsert({
        where: { user_id: userId },
        create: { user_id: userId, ...data },
        update: data,
      });
      await tx.attendancePolicyLocation.deleteMany({
        where: { policy_id: saved.id },
      });
      if (locationIds.length) {
        await tx.attendancePolicyLocation.createMany({
          data: locationIds.map((location_id) => ({
            policy_id: saved.id,
            location_id,
          })),
        });
      }
      await tx.adminAuditLog.create({
        data: auditData(
          actor,
          'set_attendance_policy',
          'attendance_policy',
          userId,
          {
            ...fields,
            work_location_ids: locationIds,
          },
        ),
      });
      return saved;
    });

    return this.getPolicy(policy.user_id);
  }

  // ─── Calculation ─────────────────────────────────────────────────────────

  /**
   * One employee's working hours over a range, from their clocked time only,
   * with each session checked against their attendance policy — and their
   * visits over the same range, reported separately.
   */
  async calculate(userId: string, q: RangeQueryDto) {
    const now = new Date();
    // Validates the range, 404s non-employees, and resolves the assigned hours.
    const detail = await this.workHours.employeeDetail(userId, q);
    const { from, to } = detail;
    const rangeStart = parseDateKey(from);
    const rangeEnd = parseDateKey(addDays(to, 1));

    // Visits a day either side can still make a store valid inside the range
    // (a margin reaching over midnight).
    const padStart = parseDateKey(addDays(from, -1));
    const padEnd = parseDateKey(addDays(to, 2));

    const [policyRow, sessions, visits] = await Promise.all([
      this.prisma.attendancePolicy.findUnique({
        where: { user_id: userId },
        include: POLICY_INCLUDE,
      }),
      this.prisma.workSession.findMany({
        where: {
          user_id: userId,
          clock_in: { lt: rangeEnd },
          OR: [{ clock_out: null }, { clock_out: { gt: rangeStart } }],
        },
        orderBy: { clock_in: 'asc' },
      }),
      this.prisma.visit.findMany({
        where: {
          user_id: userId,
          OR: [
            { checkin_time: { gte: padStart, lt: padEnd } },
            {
              checkin_time: null,
              planned_date: {
                gte: toDbDate(addDays(from, -1)),
                lte: toDbDate(addDays(to, 1)),
              },
            },
          ],
        },
        include: {
          store: {
            select: { id: true, name: true, latitude: true, longitude: true },
          },
        },
        orderBy: [{ checkin_time: 'asc' }, { planned_date: 'asc' }],
      }),
    ]);

    const policy = toPolicy(policyRow);
    const checked = policy.enabled;
    const ctx = checked
      ? await this.placeContext(userId, policyRow!, visits, now)
      : { always: [], timed: [] };

    // ── Sessions ──
    const evaluated = sessions.map((s) => {
      const manual = s.source === WorkSessionSource.manual;
      const inCheck =
        checked && !manual
          ? checkPoint(
              position(s.clock_in_lat, s.clock_in_lng),
              s.clock_in,
              ctx,
            )
          : null;
      const outCheck =
        checked && !manual && s.clock_out
          ? checkPoint(
              position(s.clock_out_lat, s.clock_out_lng),
              s.clock_out,
              ctx,
            )
          : null;
      const verdict = sessionVerdict(
        checked,
        manual,
        [inCheck, outCheck].filter((c): c is PointCheck => !!c),
      );
      return {
        session: s,
        verdict,
        counts: verdictCounts(verdict, policy),
        checks: { clock_in: inCheck, clock_out: outCheck },
      };
    });

    // ── Visits (separate from working time) ──
    const inRange = visits.filter((v) => {
      const day = v.checkin_time
        ? toDateKey(v.checkin_time)
        : v.planned_date
          ? fromDbDate(v.planned_date)
          : null;
      return !!day && day >= from && day <= to;
    });
    const visitSeconds = (v: (typeof visits)[number]) => {
      if (!v.checkin_time) return 0;
      if (v.duration_seconds != null) return v.duration_seconds;
      const end = v.checkout_time ?? now;
      return Math.max(
        0,
        Math.min(
          Math.floor((end.getTime() - v.checkin_time.getTime()) / 1000),
          MAX_SESSION_SECONDS,
        ),
      );
    };

    // ── Day by day ──
    const days = detail.days.map((d) => {
      const dayStart = parseDateKey(d.date);
      const dayEnd = parseDateKey(addDays(d.date, 1));
      const buckets = emptyBuckets();
      let recorded = 0;
      let counted = 0;
      for (const e of evaluated) {
        const sec = overlapSeconds(e.session, dayStart, dayEnd, now);
        if (!sec) continue;
        recorded += sec;
        buckets[e.verdict] += sec;
        if (e.counts) counted += sec;
      }
      const dayVisits = inRange.filter(
        (v) => v.checkin_time && toDateKey(v.checkin_time) === d.date,
      );
      return {
        date: d.date,
        planned: d.planned,
        assigned_seconds: d.assigned_seconds,
        recorded_seconds: recorded,
        counted_seconds: counted,
        excluded_seconds: recorded - counted,
        verified_seconds: buckets.verified,
        off_site_seconds: buckets.off_site,
        unverified_seconds: buckets.unverified,
        manual_seconds: buckets.manual,
        status: dayStatus({
          assignedSeconds: d.assigned_seconds,
          workedSeconds: counted,
          isWorking: d.is_working,
          shiftEnd: d.planned ? atTime(d.date, d.planned.end) : null,
          now,
        }),
        is_working: d.is_working,
        visit_count: dayVisits.length,
        visit_seconds: dayVisits.reduce((t, v) => t + visitSeconds(v), 0),
      };
    });

    const total = (pick: (d: (typeof days)[number]) => number) =>
      days.reduce((t, d) => t + pick(d), 0);
    const assigned = total((d) => d.assigned_seconds);
    const counted = total((d) => d.counted_seconds);
    const performed = inRange.filter((v) => v.checkin_time);

    return {
      employee: detail.employee,
      from,
      to,
      today: detail.today,
      generated_at: now,
      policy,
      working_hours: {
        assigned_seconds: assigned,
        recorded_seconds: total((d) => d.recorded_seconds),
        counted_seconds: counted,
        excluded_seconds: total((d) => d.excluded_seconds),
        verified_seconds: total((d) => d.verified_seconds),
        off_site_seconds: total((d) => d.off_site_seconds),
        unverified_seconds: total((d) => d.unverified_seconds),
        manual_seconds: total((d) => d.manual_seconds),
        remaining_seconds: Math.max(0, assigned - counted),
        overtime_seconds: Math.max(0, counted - assigned),
        session_count: evaluated.filter(
          (e) => overlapSeconds(e.session, rangeStart, rangeEnd, now) > 0,
        ).length,
      },
      visits: {
        performed: performed.length,
        completed: performed.filter((v) => v.status === VisitStatus.completed)
          .length,
        open: performed.filter((v) => v.status === VisitStatus.open).length,
        not_started: inRange.filter((v) => v.status === VisitStatus.planned)
          .length,
        total_seconds: performed.reduce((t, v) => t + visitSeconds(v), 0),
      },
      days,
      sessions: evaluated
        .map((e) => ({
          id: e.session.id,
          clock_in: e.session.clock_in,
          clock_out: e.session.clock_out,
          is_open: !e.session.clock_out,
          source: e.session.source,
          note: e.session.note,
          seconds: overlapSeconds(e.session, rangeStart, rangeEnd, now),
          verdict: e.verdict,
          counts: e.counts,
          checks: e.checks,
        }))
        .filter((s) => s.seconds > 0),
      visit_list: inRange.map((v) => ({
        id: v.id,
        status: v.status,
        store: { id: v.store.id, name: v.store.name },
        planned_date: v.planned_date ? fromDbDate(v.planned_date) : null,
        planned_time: v.planned_time,
        checkin_time: v.checkin_time,
        checkout_time: v.checkout_time,
        duration_seconds: visitSeconds(v),
      })),
    };
  }

  // ─── Internals ───────────────────────────────────────────────────────────

  /** The places `policy` accepts, resolved against this employee's stores and visits. */
  private async placeContext(
    userId: string,
    policy: PolicyRecord,
    visits: {
      id: string;
      checkin_time: Date | null;
      checkout_time: Date | null;
      planned_date: Date | null;
      planned_time: string | null;
      store: {
        id: string;
        name: string;
        latitude: Prisma.Decimal | null;
        longitude: Prisma.Decimal | null;
      };
    }[],
    now: Date,
  ): Promise<PlaceContext> {
    const ctx: PlaceContext = { always: [], timed: [] };
    const radius = policy.store_radius_meters;

    if (policy.allow_work_locations) {
      for (const { location: l } of policy.locations) {
        if (!l.is_active) continue;
        ctx.always.push({
          kind: 'work_location',
          id: l.id,
          name: l.name,
          lat: Number(l.latitude),
          lng: Number(l.longitude),
          radius_meters: l.radius_meters,
        });
      }
    }

    if (policy.allow_assigned_stores) {
      const assigned = await this.prisma.userStore.findMany({
        where: { user_id: userId },
        select: {
          store: {
            select: { id: true, name: true, latitude: true, longitude: true },
          },
        },
      });
      for (const { store: s } of assigned) {
        if (s.latitude == null || s.longitude == null) continue;
        ctx.always.push({
          kind: 'assigned_store',
          id: s.id,
          name: s.name,
          lat: Number(s.latitude),
          lng: Number(s.longitude),
          radius_meters: radius,
        });
      }
    }

    if (policy.allow_visit_stores) {
      for (const v of visits) {
        if (v.store.latitude == null || v.store.longitude == null) continue;
        const window = visitWindow(
          {
            checkin_time: v.checkin_time,
            checkout_time: v.checkout_time,
            planned_date: v.planned_date ? fromDbDate(v.planned_date) : null,
            planned_time: v.planned_time,
          },
          policy.visit_scope,
          policy.visit_margin_minutes,
          now,
        );
        if (!window) continue;
        const place: TimedPlace = {
          kind: 'visit_store',
          id: v.store.id,
          name: v.store.name,
          lat: Number(v.store.latitude),
          lng: Number(v.store.longitude),
          radius_meters: radius,
          visit_id: v.id,
          ...window,
        };
        ctx.timed.push(place);
      }
    }
    return ctx;
  }

  private async assertEmployee(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user || user.role === UserRole.super_admin)
      throw new NotFoundException('Employee not found');
  }

  private audit(
    actor: User,
    action: string,
    resource: string,
    resourceId: string | null,
    metadata: unknown,
  ) {
    return this.prisma.adminAuditLog.create({
      data: auditData(actor, action, resource, resourceId, metadata),
    });
  }
}

function auditData(
  actor: User,
  action: string,
  resource: string,
  resourceId: string | null,
  metadata: unknown,
) {
  return {
    actor_id: actor.id,
    actor_email: actor.email,
    action,
    resource,
    resource_id: resourceId,
    metadata: JSON.parse(JSON.stringify(metadata)) as Prisma.InputJsonValue,
  };
}

function toLocation(l: {
  id: string;
  name: string;
  address: string | null;
  latitude: Prisma.Decimal;
  longitude: Prisma.Decimal;
  radius_meters: number;
  is_active: boolean;
}) {
  return {
    id: l.id,
    name: l.name,
    address: l.address,
    latitude: Number(l.latitude),
    longitude: Number(l.longitude),
    radius_meters: l.radius_meters,
    is_active: l.is_active,
  };
}

function toPolicy(p: PolicyRecord | null) {
  const rules = p ?? DEFAULT_POLICY;
  const counting: CountingRules = {
    count_off_site: rules.count_off_site,
    count_unverified: rules.count_unverified,
  };
  return {
    configured: !!p,
    enabled: rules.enabled,
    allow_work_locations: rules.allow_work_locations,
    allow_visit_stores: rules.allow_visit_stores,
    allow_assigned_stores: rules.allow_assigned_stores,
    visit_scope: rules.visit_scope,
    visit_margin_minutes: rules.visit_margin_minutes,
    store_radius_meters: rules.store_radius_meters,
    ...counting,
    work_locations: (p?.locations ?? []).map(({ location }) =>
      toLocation(location),
    ),
    note: p?.note ?? null,
    updated_at: p?.updated_at ?? null,
    updated_by: p?.updated_by ?? null,
  };
}

function position(lat: Prisma.Decimal | null, lng: Prisma.Decimal | null) {
  return lat == null || lng == null
    ? null
    : { lat: Number(lat), lng: Number(lng) };
}

function emptyBuckets(): Record<SessionVerdict, number> {
  return Object.fromEntries(VERDICTS.map((v) => [v, 0])) as Record<
    SessionVerdict,
    number
  >;
}
