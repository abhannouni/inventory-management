import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  User,
  UserRole,
  WorkSession,
  WorkSessionSource,
} from '@prisma/client';
import { paginated } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { RangeQueryDto } from './dto/range-query.dto';
import { AssignSchedulesDto, SetRoleScheduleDto } from './dto/set-schedule.dto';
import {
  EmployeeFilterDto,
  TRACKING_SORT_FIELDS,
  TrackingQueryDto,
} from './dto/tracking-query.dto';
import {
  CreateWorkSessionDto,
  UpdateWorkSessionDto,
} from './dto/work-session.dto';
import {
  DAYS_PER_WEEK,
  MAX_RANGE_DAYS,
  MAX_SESSION_SECONDS,
  STATUS_SEVERITY,
  ScheduleDay,
  ScheduleVersion,
  WeekDays,
  WorkStatus,
  addDays,
  assertDateKey,
  atTime,
  dayMinutes,
  dayStatus,
  eachDateKey,
  effectiveEnd,
  fromDbDate,
  isStale,
  normalizeDays,
  overlapSeconds,
  parseDateKey,
  readDays,
  resolveSchedule,
  toDateKey,
  toDbDate,
  versionAsOf,
  weekMinutes,
  weekStart,
  weekdayIndex,
} from './work-hours.util';

export const TIME_CLOCK_FLAG = 'hr.time_clock';

/** A manually entered record longer than this is almost certainly a typo. */
const MAX_MANUAL_SESSION_MS = 24 * 3600 * 1000;
/** Tolerated clock drift between the admin's browser and the server. */
const FUTURE_SKEW_MS = 60 * 1000;

const EMPLOYEE_INCLUDE = {
  region: { select: { id: true, name: true } },
  custom_role: {
    select: { id: true, name: true, label: true, is_system: true },
  },
  supervisor: { select: { id: true, full_name: true } },
} satisfies Prisma.UserInclude;

type EmployeeRecord = Prisma.UserGetPayload<{
  include: typeof EMPLOYEE_INCLUDE;
}>;

interface RoleInfo {
  id: string;
  name: string;
  label: string;
  is_system: boolean;
}

export interface DayResult {
  date: string;
  planned: ScheduleDay | null;
  assigned_seconds: number;
  worked_seconds: number;
  remaining_seconds: number;
  overtime_seconds: number;
  status: WorkStatus;
  is_working: boolean;
  /** A session touching this day was never clocked out — needs an HR correction. */
  needs_review: boolean;
  first_in: Date | null;
  last_out: Date | null;
  sessions: WorkSession[];
}

/**
 * Working hours: schedules (role defaults + personal overrides, versioned by
 * effective date), recorded time (self clock-in/out and HR entries), and the
 * per-day comparison of the two that drives the colour-coded tracking.
 *
 * "Employees" are the existing active user accounts, minus Super Admins (who
 * run the platform rather than work shifts on it — same scoping as training's
 * assignable users). Nothing here creates or edits a user.
 */
@Injectable()
export class WorkHoursService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  // ─── Lookups ─────────────────────────────────────────────────────────────

  /** Options for the role / region / team filters. */
  async filters() {
    const [roles, regions, supervisors] = await Promise.all([
      this.prisma.role.findMany({
        where: { name: { not: UserRole.super_admin } },
        select: { id: true, name: true, label: true, is_system: true },
        orderBy: { label: 'asc' },
      }),
      this.prisma.region.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.user.findMany({
        where: { role: UserRole.supervisor, is_active: true },
        select: { id: true, full_name: true },
        orderBy: { full_name: 'asc' },
      }),
    ]);
    return { roles, regions, supervisors };
  }

  /** Every employee matching the filters — unpaginated, for the scheduling picker. */
  async listEmployees(q: EmployeeFilterDto) {
    const today = toDateKey(new Date());
    const employees = await this.loadEmployees(q);
    const roles = await this.roleIndex();
    const { byUser, byRole } = await this.loadVersions(
      employees.map((e) => e.id),
      this.roleIdsOf(employees, roles),
    );

    return employees.map((e) => {
      const roleId = this.roleIdOf(e, roles);
      const userVersions = byUser.get(e.id) ?? [];
      const roleVersions = roleId ? (byRole.get(roleId) ?? []) : [];
      const current = resolveSchedule(userVersions, roleVersions, today);
      const next = this.nextChange([...userVersions, ...roleVersions], today);
      return {
        ...this.toEmployee(e, roles),
        schedule: {
          source: current.source,
          days: current.days,
          weekly_minutes: weekMinutes(current.days),
          next_change_from: next?.effective_from ?? null,
        },
      };
    });
  }

  // ─── Tracking ────────────────────────────────────────────────────────────

  /** One day, every matching employee: assigned vs worked, with a status each. */
  async tracking(q: TrackingQueryDto) {
    const now = new Date();
    const today = toDateKey(now);
    const date = q.date ? assertDateKey(q.date) : today;

    const employees = await this.loadEmployees(q);
    const roles = await this.roleIndex();
    const ids = employees.map((e) => e.id);
    const dayStart = parseDateKey(date);
    const dayEnd = parseDateKey(addDays(date, 1));

    const [{ byUser, byRole }, sessions] = await Promise.all([
      this.loadVersions(ids, this.roleIdsOf(employees, roles), date),
      this.loadSessions(ids, dayStart, dayEnd),
    ]);
    const sessionsByUser = groupBy(sessions, (s) => s.user_id);

    const rows = employees.map((e) => {
      const roleId = this.roleIdOf(e, roles);
      const schedule = resolveSchedule(
        byUser.get(e.id) ?? [],
        roleId ? (byRole.get(roleId) ?? []) : [],
        date,
      );
      const day = this.computeDay(
        date,
        schedule.days,
        sessionsByUser.get(e.id) ?? [],
        now,
        today,
      );
      const { sessions: daySessions, ...dayFields } = day;
      return {
        ...this.toEmployee(e, roles),
        schedule_source: schedule.source,
        ...dayFields,
        session_count: daySessions.length,
      };
    });

    const summary = {
      total: rows.length,
      completed: count(rows, (r) => r.status === 'completed'),
      short: count(rows, (r) => r.status === 'short'),
      missing: count(rows, (r) => r.status === 'missing'),
      in_progress: count(rows, (r) => r.status === 'in_progress'),
      not_started: count(rows, (r) => r.status === 'not_started'),
      no_schedule: count(rows, (r) => r.status === 'no_schedule'),
      working_now: count(rows, (r) => r.is_working),
      needs_review: count(rows, (r) => r.needs_review),
      assigned_seconds: sum(rows, (r) => r.assigned_seconds),
      worked_seconds: sum(rows, (r) => r.worked_seconds),
    };

    // The summary describes everyone matching the other filters, so the KPI
    // tiles don't collapse to one number when a status filter is applied.
    const filtered = q.status
      ? rows.filter((r) => r.status === q.status)
      : rows;
    filtered.sort(this.trackingComparator(q.sort_by, q.sort_dir));

    const start = (q.page - 1) * q.limit;
    return {
      date,
      today,
      generated_at: now,
      summary,
      ...paginated(
        filtered.slice(start, start + q.limit),
        filtered.length,
        q.page,
        q.limit,
      ),
    };
  }

  /** One employee over a range (default: this week), with schedule history. */
  async employeeDetail(id: string, q: RangeQueryDto) {
    const now = new Date();
    const today = toDateKey(now);
    const from = q.from ? assertDateKey(q.from, 'from') : weekStart(today);
    const to = q.to
      ? assertDateKey(q.to, 'to')
      : addDays(from, DAYS_PER_WEEK - 1);
    if (to < from) throw new BadRequestException('to must be on or after from');
    const keys = eachDateKey(from, to);
    if (keys.length > MAX_RANGE_DAYS) {
      throw new BadRequestException(
        `A range can cover at most ${MAX_RANGE_DAYS} days`,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      include: EMPLOYEE_INCLUDE,
    });
    if (!user || user.role === UserRole.super_admin)
      throw new NotFoundException('Employee not found');

    const roles = await this.roleIndex();
    const roleId = this.roleIdOf(user, roles);

    const [history, sessions] = await Promise.all([
      this.prisma.workSchedule.findMany({
        where: {
          OR: [{ user_id: id }, ...(roleId ? [{ role_id: roleId }] : [])],
        },
        include: { created_by: { select: { id: true, full_name: true } } },
        orderBy: [{ effective_from: 'desc' }, { created_at: 'desc' }],
      }),
      this.loadSessions([id], parseDateKey(from), parseDateKey(addDays(to, 1))),
    ]);

    const userVersions = history.filter((v) => v.user_id).map(toVersion);
    const roleVersions = history.filter((v) => v.role_id).map(toVersion);

    const days = keys.map((key) => {
      const schedule = resolveSchedule(userVersions, roleVersions, key);
      return {
        ...this.computeDay(key, schedule.days, sessions, now, today),
        schedule_source: schedule.source,
      };
    });

    const current = resolveSchedule(userVersions, roleVersions, today);
    const roleDefault = versionAsOf(roleVersions, today)?.days ?? null;
    const currentUserId = versionAsOf(userVersions, today)?.id;
    const currentRoleId = versionAsOf(roleVersions, today)?.id;

    return {
      employee: this.toEmployee(user, roles),
      today,
      from,
      to,
      schedule: {
        source: current.source,
        days: current.days,
        weekly_minutes: weekMinutes(current.days),
      },
      role_default: {
        days: roleDefault,
        weekly_minutes: weekMinutes(roleDefault),
      },
      totals: {
        assigned_seconds: sum(days, (d) => d.assigned_seconds),
        worked_seconds: sum(days, (d) => d.worked_seconds),
        remaining_seconds: sum(days, (d) => d.remaining_seconds),
        overtime_seconds: sum(days, (d) => d.overtime_seconds),
      },
      days: days.map((d) => ({
        ...d,
        sessions: d.sessions.map((s) => this.toSession(s, now)),
      })),
      history: history.slice(0, 100).map((v) => {
        const days = readDays(v.days);
        const effective = fromDbDate(v.effective_from);
        return {
          id: v.id,
          scope: v.user_id ? ('employee' as const) : ('role' as const),
          /** employee rows: `custom` (own hours), `none`, or `role_default` (reverted). */
          kind: v.user_id
            ? v.days === null
              ? 'role_default'
              : weekMinutes(days) > 0
                ? 'custom'
                : 'none'
            : v.days === null
              ? 'removed'
              : 'role_schedule',
          days,
          weekly_minutes: weekMinutes(days),
          effective_from: effective,
          note: v.note,
          created_at: v.created_at,
          created_by: v.created_by,
          is_current: v.id === currentUserId || v.id === currentRoleId,
          is_upcoming: effective > today,
        };
      }),
    };
  }

  // ─── Schedules ───────────────────────────────────────────────────────────

  /** Every role's default hours in force today, plus any scheduled change. */
  async listRoleSchedules() {
    const today = toDateKey(new Date());
    const roles = await this.prisma.role.findMany({
      where: { name: { not: UserRole.super_admin } },
      select: { id: true, name: true, label: true, is_system: true },
      orderBy: { label: 'asc' },
    });
    const [versions, counts] = await Promise.all([
      this.prisma.workSchedule.findMany({
        where: { role_id: { in: roles.map((r) => r.id) } },
      }),
      this.prisma.user.groupBy({
        by: ['role_id'],
        where: { is_active: true, role: { not: UserRole.super_admin } },
        _count: { _all: true },
      }),
    ]);
    const byRole = groupBy(versions, (v) => v.role_id!);
    const countByRole = new Map(counts.map((c) => [c.role_id, c._count._all]));

    return roles.map((role) => {
      const list = (byRole.get(role.id) ?? []).map(toVersion);
      const current = versionAsOf(list, today);
      const next = this.nextChange(list, today);
      return {
        ...role,
        employee_count: countByRole.get(role.id) ?? 0,
        days: current?.days ?? null,
        weekly_minutes: weekMinutes(current?.days ?? null),
        effective_from: current?.effective_from ?? null,
        upcoming: next
          ? {
              days: next.days,
              weekly_minutes: weekMinutes(next.days),
              effective_from: next.effective_from,
            }
          : null,
      };
    });
  }

  async setRoleSchedule(roleId: string, dto: SetRoleScheduleDto, actor: User) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');
    if (role.name === UserRole.super_admin) {
      throw new BadRequestException('Super Administrators are not scheduled');
    }

    const days = dto.days === null ? null : normalizeDays(dto.days);
    const effective = this.effectiveFrom(dto.effective_from);

    const [version] = await this.prisma.$transaction([
      this.prisma.workSchedule.create({
        data: {
          role_id: roleId,
          days: toJsonDays(days),
          effective_from: toDbDate(effective),
          note: dto.note,
          created_by_id: actor.id,
        },
      }),
      this.audit(
        actor,
        days ? 'set_role_schedule' : 'remove_role_schedule',
        'work_schedule',
        roleId,
        {
          role: role.name,
          days,
          effective_from: effective,
        },
      ),
    ]);
    return {
      id: version.id,
      role_id: roleId,
      days,
      weekly_minutes: weekMinutes(days),
      effective_from: effective,
    };
  }

  /**
   * Assigns hours to any number of employees at once. Every target is checked
   * up front and all versions are written in one transaction — either every
   * selected employee gets the new schedule or none does.
   */
  async assignSchedules(dto: AssignSchedulesDto, actor: User) {
    const ids = Array.from(new Set(dto.user_ids));
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, role: true },
    });
    if (users.length !== ids.length) {
      throw new NotFoundException(
        `${ids.length - users.length} selected employee(s) no longer exist`,
      );
    }
    if (users.some((u) => u.role === UserRole.super_admin)) {
      throw new BadRequestException('Super Administrators are not scheduled');
    }

    let days: WeekDays | null;
    if (dto.mode === 'custom') days = normalizeDays(dto.days);
    else if (dto.mode === 'none')
      days = Array.from({ length: DAYS_PER_WEEK }, () => null);
    else days = null;

    const effective = this.effectiveFrom(dto.effective_from);

    await this.prisma.$transaction([
      this.prisma.workSchedule.createMany({
        data: ids.map((user_id) => ({
          user_id,
          days: toJsonDays(days),
          effective_from: toDbDate(effective),
          note: dto.note,
          created_by_id: actor.id,
        })),
      }),
      this.audit(
        actor,
        `assign_schedule_${dto.mode}`,
        'work_schedule',
        ids.length === 1 ? ids[0] : null,
        {
          user_ids: ids,
          mode: dto.mode,
          days,
          effective_from: effective,
        },
      ),
    ]);

    return { updated: ids.length, mode: dto.mode, effective_from: effective };
  }

  // ─── Time records (HR) ───────────────────────────────────────────────────

  async createSession(dto: CreateWorkSessionDto, actor: User) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.user_id },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('Employee not found');

    const clockIn = new Date(dto.clock_in);
    const clockOut = dto.clock_out ? new Date(dto.clock_out) : null;
    await this.assertValidSession(dto.user_id, clockIn, clockOut);

    const [session] = await this.prisma.$transaction([
      this.prisma.workSession.create({
        data: {
          user_id: dto.user_id,
          clock_in: clockIn,
          clock_out: clockOut,
          source: WorkSessionSource.manual,
          note: dto.note,
          created_by_id: actor.id,
        },
      }),
      this.audit(actor, 'create_work_session', 'work_session', dto.user_id, {
        clock_in: clockIn,
        clock_out: clockOut,
        note: dto.note ?? null,
      }),
    ]);
    return this.toSession(session, new Date());
  }

  async updateSession(id: string, dto: UpdateWorkSessionDto, actor: User) {
    const existing = await this.prisma.workSession.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Time record not found');

    const clockIn = dto.clock_in ? new Date(dto.clock_in) : existing.clock_in;
    const clockOut =
      dto.clock_out === undefined
        ? existing.clock_out
        : dto.clock_out
          ? new Date(dto.clock_out)
          : null;
    await this.assertValidSession(existing.user_id, clockIn, clockOut, id);

    const [session] = await this.prisma.$transaction([
      this.prisma.workSession.update({
        where: { id },
        data: {
          clock_in: clockIn,
          clock_out: clockOut,
          note: dto.note ?? existing.note,
          created_by_id: actor.id,
        },
      }),
      this.audit(
        actor,
        'update_work_session',
        'work_session',
        existing.user_id,
        {
          session_id: id,
          before: {
            clock_in: existing.clock_in,
            clock_out: existing.clock_out,
            note: existing.note,
          },
          after: {
            clock_in: clockIn,
            clock_out: clockOut,
            note: dto.note ?? existing.note,
          },
        },
      ),
    ]);
    return this.toSession(session, new Date());
  }

  async removeSession(id: string, actor: User) {
    const existing = await this.prisma.workSession.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Time record not found');

    await this.prisma.$transaction([
      this.prisma.workSession.delete({ where: { id } }),
      this.audit(
        actor,
        'delete_work_session',
        'work_session',
        existing.user_id,
        {
          session_id: id,
          clock_in: existing.clock_in,
          clock_out: existing.clock_out,
          source: existing.source,
          note: existing.note,
        },
      ),
    ]);
  }

  // ─── Self-service clock ──────────────────────────────────────────────────

  async myToday(user: User) {
    const now = new Date();
    const today = toDateKey(now);
    const enabled = await this.settings.isEnabled(TIME_CLOCK_FLAG);

    const roles = await this.roleIndex();
    const roleId = user.role_id ?? roles.byName.get(user.role)?.id ?? null;
    const [{ byUser, byRole }, sessions, open] = await Promise.all([
      this.loadVersions([user.id], roleId ? [roleId] : [], today),
      this.loadSessions(
        [user.id],
        parseDateKey(today),
        parseDateKey(addDays(today, 1)),
      ),
      this.prisma.workSession.findFirst({
        where: { user_id: user.id, clock_out: null },
        orderBy: { clock_in: 'desc' },
      }),
    ]);

    const schedule = resolveSchedule(
      byUser.get(user.id) ?? [],
      roleId ? (byRole.get(roleId) ?? []) : [],
      today,
    );
    const day = this.computeDay(today, schedule.days, sessions, now, today);

    return {
      enabled,
      server_now: now,
      ...day,
      schedule_source: schedule.source,
      sessions: day.sessions.map((s) => this.toSession(s, now)),
      open_session: open ? this.toSession(open, now) : null,
    };
  }

  async clockIn(user: User) {
    if (!(await this.settings.isEnabled(TIME_CLOCK_FLAG))) {
      throw new ForbiddenException('The time clock is turned off');
    }
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      // Serialises concurrent clock-ins for this user (a double tap on a slow
      // connection), so the "one open session" rule can't be raced.
      // ($executeRaw: the lock function returns `void`, which $queryRaw can't deserialise.)
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`;

      const open = await tx.workSession.findFirst({
        where: { user_id: user.id, clock_out: null },
      });
      if (open && !isStale(open, now)) return; // already clocked in — idempotent

      if (open) {
        // Forgotten clock-out: close it where counting stopped anyway, and
        // leave a note so HR can see it and correct the real time.
        await tx.workSession.update({
          where: { id: open.id },
          data: {
            clock_out: new Date(
              open.clock_in.getTime() + MAX_SESSION_SECONDS * 1000,
            ),
            note: open.note ?? 'Auto-closed: no clock-out was recorded',
          },
        });
      }
      await tx.workSession.create({
        data: {
          user_id: user.id,
          clock_in: now,
          source: WorkSessionSource.clock,
        },
      });
    });

    return this.myToday(user);
  }

  /** Always allowed, even with the clock turned off, so nobody is stuck clocked in. */
  async clockOut(user: User) {
    const now = new Date();
    const open = await this.prisma.workSession.findFirst({
      where: { user_id: user.id, clock_out: null },
      orderBy: { clock_in: 'desc' },
    });
    if (!open) throw new BadRequestException('You are not clocked in');

    const stale = isStale(open, now);
    await this.prisma.workSession.update({
      where: { id: open.id },
      data: {
        clock_out: effectiveEnd(open, now),
        note: stale
          ? (open.note ?? 'Auto-closed: no clock-out was recorded')
          : open.note,
      },
    });
    return this.myToday(user);
  }

  // ─── Internals ───────────────────────────────────────────────────────────

  private computeDay(
    key: string,
    days: WeekDays | null,
    sessions: WorkSession[],
    now: Date,
    today: string,
  ): DayResult {
    const dayStart = parseDateKey(key);
    const dayEnd = parseDateKey(addDays(key, 1));
    const planned = days?.[weekdayIndex(dayStart)] ?? null;
    const assigned = dayMinutes(planned) * 60;

    const touching = sessions.filter(
      (s) =>
        s.clock_in < dayEnd && (s.clock_out === null || s.clock_out > dayStart),
    );
    const worked = touching.reduce(
      (t, s) => t + overlapSeconds(s, dayStart, dayEnd, now),
      0,
    );
    const isWorking =
      key === today && touching.some((s) => !s.clock_out && !isStale(s, now));

    const firstIn = touching.length ? touching[0].clock_in : null;
    const lastOut =
      isWorking || !touching.length
        ? null
        : touching.reduce<Date | null>((latest, s) => {
            const end = s.clock_out ?? effectiveEnd(s, now);
            return !latest || end > latest ? end : latest;
          }, null);

    return {
      date: key,
      planned,
      assigned_seconds: assigned,
      worked_seconds: worked,
      remaining_seconds: Math.max(0, assigned - worked),
      overtime_seconds: Math.max(0, worked - assigned),
      status: dayStatus({
        assignedSeconds: assigned,
        workedSeconds: worked,
        isWorking,
        shiftEnd: planned ? atTime(key, planned.end) : null,
        now,
      }),
      is_working: isWorking,
      needs_review: touching.some((s) => isStale(s, now)),
      first_in: firstIn,
      last_out: lastOut,
      sessions: touching,
    };
  }

  private toSession(s: WorkSession, now: Date) {
    return {
      id: s.id,
      clock_in: s.clock_in,
      clock_out: s.clock_out,
      source: s.source,
      note: s.note,
      is_open: !s.clock_out,
      is_stale: isStale(s, now),
      duration_seconds: Math.max(
        0,
        Math.floor(
          (effectiveEnd(s, now).getTime() - s.clock_in.getTime()) / 1000,
        ),
      ),
    };
  }

  private toEmployee(e: EmployeeRecord, roles: RoleIndex) {
    const role = e.custom_role ?? roles.byName.get(e.role) ?? null;
    return {
      id: e.id,
      full_name: e.full_name,
      email: e.email,
      role: e.role,
      role_id: role?.id ?? null,
      role_name: role?.name ?? e.role,
      role_label: role?.label ?? e.role,
      role_is_system: role?.is_system ?? true,
      region: e.region,
      supervisor: e.supervisor,
    };
  }

  private loadEmployees(q: EmployeeFilterDto) {
    const where: Prisma.UserWhereInput = {
      is_active: true,
      role: { not: UserRole.super_admin },
    };
    if (q.search) {
      where.OR = [
        { full_name: { contains: q.search, mode: 'insensitive' } },
        { email: { contains: q.search, mode: 'insensitive' } },
      ];
    }
    if (q.role_id) where.role_id = q.role_id;
    if (q.region_id) where.region_id = q.region_id;
    if (q.supervisor_id) where.supervisor_id = q.supervisor_id;

    return this.prisma.user.findMany({
      where,
      include: EMPLOYEE_INCLUDE,
      orderBy: { full_name: 'asc' },
    });
  }

  private async roleIndex(): Promise<RoleIndex> {
    const roles = await this.prisma.role.findMany({
      select: { id: true, name: true, label: true, is_system: true },
    });
    return { byName: new Map(roles.map((r) => [r.name, r])) };
  }

  /** `role_id` is backfilled by the RBAC sync; the enum lookup covers any gap. */
  private roleIdOf(
    e: { role_id: string | null; role: UserRole },
    roles: RoleIndex,
  ) {
    return e.role_id ?? roles.byName.get(e.role)?.id ?? null;
  }

  private roleIdsOf(employees: EmployeeRecord[], roles: RoleIndex) {
    return Array.from(
      new Set(
        employees
          .map((e) => this.roleIdOf(e, roles))
          .filter((id): id is string => !!id),
      ),
    );
  }

  private async loadVersions(
    userIds: string[],
    roleIds: string[],
    upTo?: string,
  ) {
    const rows =
      userIds.length || roleIds.length
        ? await this.prisma.workSchedule.findMany({
            where: {
              ...(upTo ? { effective_from: { lte: toDbDate(upTo) } } : {}),
              OR: [{ user_id: { in: userIds } }, { role_id: { in: roleIds } }],
            },
            select: {
              id: true,
              user_id: true,
              role_id: true,
              days: true,
              effective_from: true,
              created_at: true,
            },
          })
        : [];
    const byUser = new Map<string, ScheduleVersion[]>();
    const byRole = new Map<string, ScheduleVersion[]>();
    for (const row of rows) {
      const map = row.user_id ? byUser : byRole;
      const key = (row.user_id ?? row.role_id)!;
      map.set(key, [...(map.get(key) ?? []), toVersion(row)]);
    }
    return { byUser, byRole };
  }

  private loadSessions(userIds: string[], from: Date, to: Date) {
    if (!userIds.length) return Promise.resolve([] as WorkSession[]);
    return this.prisma.workSession.findMany({
      where: {
        user_id: { in: userIds },
        clock_in: { lt: to },
        OR: [{ clock_out: null }, { clock_out: { gt: from } }],
      },
      orderBy: { clock_in: 'asc' },
    });
  }

  /** The nearest version scheduled to take effect after `today`. */
  private nextChange(versions: ScheduleVersion[], today: string) {
    const future = versions.filter((v) => v.effective_from > today);
    if (!future.length) return null;
    const first = future.reduce((a, b) =>
      b.effective_from < a.effective_from ? b : a,
    ).effective_from;
    return versionAsOf(
      future.filter((v) => v.effective_from === first),
      first,
    );
  }

  /**
   * Changes apply from today or later, never retroactively — past days stay
   * measured against the hours that were actually assigned at the time.
   */
  private effectiveFrom(value: string | undefined) {
    const today = toDateKey(new Date());
    if (!value) return today;
    assertDateKey(value, 'effective_from');
    if (value < today)
      throw new BadRequestException('effective_from cannot be in the past');
    return value;
  }

  private async assertValidSession(
    userId: string,
    clockIn: Date,
    clockOut: Date | null,
    excludeId?: string,
  ) {
    const limit = Date.now() + FUTURE_SKEW_MS;
    if (
      Number.isNaN(clockIn.getTime()) ||
      (clockOut && Number.isNaN(clockOut.getTime()))
    ) {
      throw new BadRequestException('Invalid date');
    }
    if (clockIn.getTime() > limit || (clockOut && clockOut.getTime() > limit)) {
      throw new BadRequestException('Time records cannot be in the future');
    }
    if (clockOut && clockOut <= clockIn) {
      throw new BadRequestException('The clock-out must be after the clock-in');
    }
    if (
      clockOut &&
      clockOut.getTime() - clockIn.getTime() > MAX_MANUAL_SESSION_MS
    ) {
      throw new BadRequestException(
        'A single time record cannot exceed 24 hours',
      );
    }

    const others = {
      user_id: userId,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    };
    if (!clockOut) {
      const open = await this.prisma.workSession.count({
        where: { ...others, clock_out: null },
      });
      if (open)
        throw new ConflictException(
          'This employee already has an open time record',
        );
    }
    const overlap = await this.prisma.workSession.findFirst({
      where: {
        ...others,
        ...(clockOut ? { clock_in: { lt: clockOut } } : {}),
        OR: [{ clock_out: null }, { clock_out: { gt: clockIn } }],
      },
    });
    if (overlap)
      throw new ConflictException('This overlaps an existing time record');
  }

  private trackingComparator(
    sortBy: string | undefined,
    sortDir: 'asc' | 'desc',
  ) {
    type Row = {
      full_name: string;
      role_label: string;
      assigned_seconds: number;
      worked_seconds: number;
      remaining_seconds: number;
      overtime_seconds: number;
      status: WorkStatus;
    };
    const severity = (r: Row) => STATUS_SEVERITY.indexOf(r.status);
    const byName = (a: Row, b: Row) => a.full_name.localeCompare(b.full_name);

    if (
      !sortBy ||
      !(TRACKING_SORT_FIELDS as readonly string[]).includes(sortBy)
    ) {
      return (a: Row, b: Row) => severity(a) - severity(b) || byName(a, b);
    }
    const dir = sortDir === 'asc' ? 1 : -1;
    const value: Record<
      (typeof TRACKING_SORT_FIELDS)[number],
      (r: Row) => number | string
    > = {
      full_name: (r) => r.full_name.toLowerCase(),
      role: (r) => r.role_label.toLowerCase(),
      assigned: (r) => r.assigned_seconds,
      worked: (r) => r.worked_seconds,
      remaining: (r) => r.remaining_seconds,
      overtime: (r) => r.overtime_seconds,
      status: severity,
    };
    const get = value[sortBy as keyof typeof value];
    return (a: Row, b: Row) => {
      const x = get(a);
      const y = get(b);
      return (x < y ? -1 : x > y ? 1 : 0) * dir || byName(a, b);
    };
  }

  private audit(
    actor: User,
    action: string,
    resource: string,
    resourceId: string | null,
    metadata: unknown,
  ) {
    return this.prisma.adminAuditLog.create({
      data: {
        actor_id: actor.id,
        actor_email: actor.email,
        action,
        resource,
        resource_id: resourceId,
        metadata: JSON.parse(JSON.stringify(metadata)) as Prisma.InputJsonValue,
      },
    });
  }
}

interface RoleIndex {
  byName: Map<string, RoleInfo>;
}

function toVersion(row: {
  id: string;
  days: unknown;
  effective_from: Date;
  created_at: Date;
}): ScheduleVersion {
  return {
    id: row.id,
    days: readDays(row.days),
    effective_from: fromDbDate(row.effective_from),
    created_at: row.created_at,
  };
}

/** SQL NULL for "no days" — a JSON `null` would read back the same but isn't what the column means. */
function toJsonDays(days: WeekDays | null) {
  return days ? (days as unknown as Prisma.InputJsonArray) : Prisma.DbNull;
}

function groupBy<T>(items: T[], key: (item: T) => string) {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return map;
}

function count<T>(items: T[], pred: (item: T) => boolean) {
  return items.reduce((n, item) => n + (pred(item) ? 1 : 0), 0);
}

function sum<T>(items: T[], value: (item: T) => number) {
  return items.reduce((n, item) => n + value(item), 0);
}
