import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType, Prisma, User, UserRole, VisitPlanStatus, VisitStatus } from '@prisma/client';
import { NotificationsService } from '../../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { assertStoreVisible } from '../../stores/store-scope';
import { AddPlannedVisitsDto } from './dto/add-visits.dto';
import { FindAllPlannedDto } from './dto/find-all-planned.dto';
import { FindVisitPlansDto } from './dto/find-plans.dto';
import { PlanVisitDto } from './dto/plan-visit.dto';
import { ReviewVisitPlanDto } from './dto/review-plan.dto';
import { SetMonthPlanDto } from './dto/set-month.dto';
import { UpdatePlannedVisitDto } from './dto/update-planned-visit.dto';

/**
 * A month plan carries its planned visits with it. Only the rows that are still
 * `planned` *plus* the ones that were planned and have since been visited belong
 * to the calendar, which is exactly "every visit with a `planned_date`" — an
 * ad-hoc check-in has none and never shows up here.
 */
const PLAN_INCLUDE = {
  user: { select: { id: true, full_name: true, email: true, role: true } },
  reviewed_by: { select: { id: true, full_name: true } },
  visits: {
    include: { store: { select: { id: true, name: true, address: true, region_id: true } } },
    orderBy: [{ planned_date: 'asc' as const }, { planned_time: 'asc' as const }, { id: 'asc' as const }],
  },
} satisfies Prisma.VisitPlanInclude;

type PlanWithVisits = Prisma.VisitPlanGetPayload<{ include: typeof PLAN_INCLUDE }>;
type PlannedSnapshot = { date: string; store_id: string; time: string | null; notes: string | null };
type PlannedLike = {
  planned_date: Date | null;
  store_id: string;
  planned_time: string | null;
  planned_notes: string | null;
};

/** The roles whose months are planned at all — everyone else has no calendar. */
const PLANNABLE_ROLES = [UserRole.supervisor, UserRole.merchandiser] as const;

function snapshotVisits(visits: PlannedLike[]): PlannedSnapshot[] {
  return visits
    .filter((v) => v.planned_date !== null)
    .map((v) => ({
      date: v.planned_date!.toISOString().slice(0, 10),
      store_id: v.store_id,
      time: v.planned_time,
      notes: v.planned_notes,
    }))
    .sort((a, b) => (a.date === b.date ? a.store_id.localeCompare(b.store_id) : a.date.localeCompare(b.date)));
}

/** Added/removed/modified days, keyed by (date, store) — used to tell a reviewer exactly what changed. */
function diffSnapshots(before: PlannedSnapshot[], after: PlannedSnapshot[]) {
  const key = (e: PlannedSnapshot) => `${e.date}__${e.store_id}`;
  const beforeMap = new Map(before.map((e) => [key(e), e]));
  const afterMap = new Map(after.map((e) => [key(e), e]));

  return {
    added: after.filter((e) => !beforeMap.has(key(e))),
    removed: before.filter((e) => !afterMap.has(key(e))),
    changed: after.filter((e) => {
      const prev = beforeMap.get(key(e));
      return !!prev && (prev.notes !== e.notes || prev.time !== e.time);
    }),
  };
}

/** Midnight UTC of the given `YYYY-MM-DD`, matching the `@db.Date` column. */
function toPlannedDate(date: string): Date {
  return new Date(`${date.slice(0, 10)}T00:00:00.000Z`);
}

@Injectable()
export class VisitPlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ─── The caller's own month ────────────────────────────────────────────

  /**
   * Read-only for a merchandiser (their month is written for them by a
   * reviewer), read-write for a supervisor — the write endpoints below are what
   * enforce that, not this.
   */
  getMine(actor: User, year: number, month: number) {
    return this.prisma.visitPlan.findUnique({
      where: { user_id_year_month: { user_id: actor.id, year, month } },
      include: PLAN_INCLUDE,
    });
  }

  /**
   * The caller's own planned visits from today forward, soonest first — what the
   * check-in screen offers as "your upcoming visits". Only days on an approved
   * month count: a draft or declined plan is not something to act on yet.
   */
  upcoming(actor: User, limit = 20) {
    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    return this.prisma.visit.findMany({
      where: {
        user_id: actor.id,
        status: VisitStatus.planned,
        planned_date: { gte: today },
        plan: { status: VisitPlanStatus.approved },
      },
      include: { store: { select: { id: true, name: true, address: true, region_id: true } } },
      orderBy: [{ planned_date: 'asc' }, { planned_time: 'asc' }, { id: 'asc' }],
      take: limit,
    });
  }

  async planVisit(actor: User, dto: PlanVisitDto) {
    this.assertOwnsTheirMonth(actor);
    if (!(await assertStoreVisible(this.prisma, actor, dto.store_id)))
      throw new ForbiddenException('You can only plan a visit at a POS you are responsible for');

    const date = toPlannedDate(dto.date);
    await this.guardDuplicate(actor.id, date, dto.store_id, dto.time);
    const plan = await this.getOrCreateDraft(actor.id, date.getUTCFullYear(), date.getUTCMonth() + 1);

    await this.createPlannedVisit(this.prisma, {
      plan_id: plan.id,
      user_id: actor.id,
      store_id: dto.store_id,
      planned_date: date,
      planned_time: dto.time ?? null,
      planned_notes: dto.notes ?? null,
      planned_by_id: actor.id,
    });

    return this.afterPlanChange(plan, actor);
  }

  async updatePlannedVisit(visitId: string, dto: UpdatePlannedVisitDto, actor: User) {
    const visit = await this.loadEditablePlannedVisit(visitId);
    if (visit.user_id !== actor.id) throw new ForbiddenException('Not your plan');

    if (dto.store_id && !(await assertStoreVisible(this.prisma, actor, dto.store_id)))
      throw new ForbiddenException('You can only plan a visit at a POS you are responsible for');

    await this.guardDuplicate(
      visit.user_id,
      dto.date !== undefined ? toPlannedDate(dto.date) : visit.planned_date!,
      dto.store_id ?? visit.store_id,
      dto.time ?? visit.planned_time,
      visitId,
    );

    await this.prisma.visit.update({
      where: { id: visitId },
      data: {
        ...(dto.date !== undefined && { planned_date: toPlannedDate(dto.date) }),
        ...(dto.store_id !== undefined && { store_id: dto.store_id }),
        ...(dto.time !== undefined && { planned_time: dto.time }),
        ...(dto.notes !== undefined && { planned_notes: dto.notes }),
      },
    });

    return this.afterPlanChange(visit.plan!, actor);
  }

  async removePlannedVisit(visitId: string, actor: User) {
    const visit = await this.loadEditablePlannedVisit(visitId);
    if (visit.user_id !== actor.id) throw new ForbiddenException('Not your plan');

    await this.prisma.visit.delete({ where: { id: visitId } });
    return this.afterPlanChange(visit.plan!, actor);
  }

  async submit(actor: User, year: number, month: number) {
    this.assertOwnsTheirMonth(actor);
    const plan = await this.prisma.visitPlan.findUnique({
      where: { user_id_year_month: { user_id: actor.id, year, month } },
      include: PLAN_INCLUDE,
    });
    if (!plan) throw new NotFoundException('No plan to submit for that month');
    if (plan.status !== VisitPlanStatus.draft && plan.status !== VisitPlanStatus.declined)
      throw new BadRequestException('Only a draft or declined plan can be submitted');
    if (!plan.visits.length) throw new BadRequestException('Plan at least one visit before submitting');

    const updated = await this.prisma.visitPlan.update({
      where: { id: plan.id },
      data: { status: VisitPlanStatus.pending_review, submitted_at: new Date(), review_note: null },
      include: PLAN_INCLUDE,
    });

    await this.notifyReviewers(NotificationType.visit_plan_submitted, plan, actor);
    return updated;
  }

  // ─── Review (super admin / admin) ──────────────────────────────────────

  /**
   * Every plannable user's month, whether or not they have a plan row yet — the
   * ones who don't come back under `missing` so a reviewer can see at a glance
   * who still owes a month and, for merchandisers, whose month nobody has
   * filled in yet.
   */
  async findAll(query: FindVisitPlansDto) {
    const roleFilter = query.role ? [query.role] : [...PLANNABLE_ROLES];
    const searchFilter = query.search
      ? {
          OR: [
            { full_name: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
            { email: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
          ],
        }
      : {};

    const where: Prisma.VisitPlanWhereInput = {
      user: { role: { in: roleFilter }, ...searchFilter },
    };
    if (query.status) where.status = query.status;
    if (query.user_id) where.user_id = query.user_id;
    if (query.year) where.year = query.year;
    if (query.month) where.month = query.month;

    const plans = await this.prisma.visitPlan.findMany({
      where,
      include: PLAN_INCLUDE,
      orderBy: [{ year: 'desc' }, { month: 'desc' }, { updated_at: 'desc' }],
    });

    let missing: { id: string; full_name: string; email: string; role: UserRole }[] = [];
    if (query.year && query.month) {
      const [users, filled] = await Promise.all([
        this.prisma.user.findMany({
          where: { role: { in: roleFilter }, is_active: true, ...searchFilter },
          select: { id: true, full_name: true, email: true, role: true },
        }),
        this.prisma.visitPlan.findMany({
          where: {
            year: query.year,
            month: query.month,
            // A merchandiser's month is written by a reviewer and lands straight
            // in `approved` — it is never "submitted", so `submitted_at` alone
            // would report every filled merchandiser month as missing.
            OR: [{ submitted_at: { not: null } }, { status: VisitPlanStatus.approved }],
          },
          select: { user_id: true },
        }),
      ]);
      const filledIds = new Set(filled.map((f) => f.user_id));
      missing = users.filter((u) => !filledIds.has(u.id));
    }

    return { plans, missing };
  }

  /**
   * Every planned visit in a month, across the people the filters select —
   * what the reviewer's month-at-a-glance calendar draws.
   *
   * Returns the plan's review state alongside each visit so the calendar can
   * colour an approved day differently from one still awaiting validation.
   */
  async findAllPlanned(query: FindAllPlannedDto) {
    const monthStart = new Date(Date.UTC(query.year, query.month - 1, 1));
    const monthEnd = new Date(Date.UTC(query.year, query.month, 1));

    const userWhere: Prisma.UserWhereInput = {
      role: query.role ? { equals: query.role } : { in: [...PLANNABLE_ROLES] },
      ...(query.supervisor_id && { supervisor_id: query.supervisor_id }),
      ...(query.user_id && { id: query.user_id }),
      ...(query.search && {
        OR: [
          { full_name: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
          { email: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
        ],
      }),
    };

    const visits = await this.prisma.visit.findMany({
      where: {
        planned_date: { gte: monthStart, lt: monthEnd },
        user: userWhere,
      },
      include: {
        user: { select: { id: true, full_name: true, email: true, role: true, supervisor_id: true } },
        store: { select: { id: true, name: true, address: true, region_id: true } },
        plan: { select: { id: true, status: true } },
      },
      orderBy: [{ planned_date: 'asc' }, { planned_time: 'asc' }, { id: 'asc' }],
    });

    // The people the filters cover, so the calendar can assign stable colours
    // and the legend can list someone whose month is still empty.
    const people = await this.prisma.user.findMany({
      where: { ...userWhere, is_active: true },
      select: { id: true, full_name: true, email: true, role: true, supervisor_id: true },
      orderBy: { full_name: 'asc' },
    });

    return { visits, people };
  }

  /**
   * A reviewer adding days to somebody's month without disturbing what is
   * already there — the "add a visit for X" action.
   *
   * Whatever month each day falls in is approved on the spot: the reviewer is
   * the approver, so there is nothing left to review.
   */
  async addVisitsForUser(userId: string, dto: AddPlannedVisitsDto, actor: User) {
    const owner = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!owner) throw new NotFoundException('User not found');
    if (!PLANNABLE_ROLES.includes(owner.role as (typeof PLANNABLE_ROLES)[number]))
      throw new BadRequestException('Only supervisors and merchandisers can be given planned visits');

    for (const v of dto.visits) {
      if (!(await assertStoreVisible(this.prisma, owner, v.store_id)))
        throw new BadRequestException(`${owner.full_name} is not assigned to one of the selected points of sale`);
    }
    this.assertNoDuplicates(dto.visits);

    const created: string[] = [];
    for (const v of dto.visits) {
      const date = toPlannedDate(v.date);
      await this.guardDuplicate(userId, date, v.store_id, v.time);
      const plan = await this.getOrCreateDraft(userId, date.getUTCFullYear(), date.getUTCMonth() + 1);
      await this.createPlannedVisit(this.prisma, {
        plan_id: plan.id,
        user_id: userId,
        store_id: v.store_id,
        planned_date: date,
        planned_time: v.time,
        planned_notes: v.notes ?? null,
        planned_by_id: actor.id,
      });
      if (!created.includes(plan.id)) created.push(plan.id);
    }

    // Approve every month the additions touched, and snapshot it so a later
    // edit by the owner still diffs against something meaningful.
    for (const planId of created) {
      const fresh = await this.prisma.visitPlan.findUniqueOrThrow({ where: { id: planId }, include: PLAN_INCLUDE });
      await this.prisma.visitPlan.update({
        where: { id: planId },
        data: {
          status: VisitPlanStatus.approved,
          submitted_at: fresh.submitted_at ?? new Date(),
          reviewed_at: new Date(),
          reviewed_by_id: actor.id,
          review_note: dto.note ?? null,
          approved_snapshot: snapshotVisits(fresh.visits) as unknown as Prisma.InputJsonValue,
        },
      });
    }

    const first = toPlannedDate(dto.visits[0].date);
    await this.notifications.createForUsers([userId], {
      type: NotificationType.visit_plan_assigned,
      title: `${actor.full_name} planned ${dto.visits.length} visit(s) for you`,
      body: dto.note ?? undefined,
      link: '/visit-planning',
      metadata: {
        year: first.getUTCFullYear(),
        month: first.getUTCMonth() + 1,
        actorName: actor.full_name,
        count: dto.visits.length,
      } as unknown as Prisma.InputJsonValue,
    });

    return this.prisma.visitPlan.findUniqueOrThrow({ where: { id: created[0] }, include: PLAN_INCLUDE });
  }

  async findOne(id: string, actor: User) {
    const plan = await this.prisma.visitPlan.findUnique({ where: { id }, include: PLAN_INCLUDE });
    if (!plan) throw new NotFoundException('Plan not found');
    if (plan.user_id !== actor.id && actor.role !== UserRole.super_admin && actor.role !== UserRole.admin)
      throw new ForbiddenException('Access denied');
    return plan;
  }

  /** A reviewer opening somebody's month — returns null when nothing is planned yet. */
  async findForUser(userId: string, year: number, month: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, full_name: true, email: true, role: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (!PLANNABLE_ROLES.includes(user.role as (typeof PLANNABLE_ROLES)[number]))
      throw new BadRequestException('Only supervisors and merchandisers have a month of planned visits');

    const plan = await this.prisma.visitPlan.findUnique({
      where: { user_id_year_month: { user_id: userId, year, month } },
      include: PLAN_INCLUDE,
    });
    return { user, plan };
  }

  async review(id: string, dto: ReviewVisitPlanDto, actor: User) {
    const plan = await this.prisma.visitPlan.findUnique({ where: { id }, include: PLAN_INCLUDE });
    if (!plan) throw new NotFoundException('Plan not found');
    if (plan.status !== VisitPlanStatus.pending_review)
      throw new BadRequestException('Only a plan pending review can be approved or declined');

    const approving = dto.action === 'approve';
    const updated = await this.prisma.visitPlan.update({
      where: { id },
      data: {
        status: approving ? VisitPlanStatus.approved : VisitPlanStatus.declined,
        reviewed_at: new Date(),
        reviewed_by_id: actor.id,
        review_note: dto.note ?? null,
        ...(approving && {
          approved_snapshot: snapshotVisits(plan.visits) as unknown as Prisma.InputJsonValue,
        }),
      },
      include: PLAN_INCLUDE,
    });

    await this.notifications.createForUsers([plan.user_id], {
      type: approving ? NotificationType.visit_plan_approved : NotificationType.visit_plan_declined,
      title: approving
        ? `Your planned visits for ${plan.month}/${plan.year} were approved`
        : `Your planned visits for ${plan.month}/${plan.year} were declined`,
      body: dto.note ?? undefined,
      link: '/visit-planning',
      metadata: { planId: plan.id, year: plan.year, month: plan.month, note: dto.note ?? null },
    });
    return updated;
  }

  /**
   * A reviewer writing somebody's whole month and approving it in one step.
   *
   * Serves both directions the feature runs in: adjusting a supervisor's
   * submitted month, and filling in a merchandiser's month from scratch (the
   * only way a merchandiser gets one). The plan row is created on demand, so
   * the reviewer does not need the owner to have opened the page first.
   *
   * Days already checked into are left untouched — only the still-`planned`
   * rows are replaced, so re-planning a month never erases work already done.
   */
  async setMonth(userId: string, dto: SetMonthPlanDto, actor: User) {
    const owner = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!owner) throw new NotFoundException('User not found');
    if (!PLANNABLE_ROLES.includes(owner.role as (typeof PLANNABLE_ROLES)[number]))
      throw new BadRequestException('Only supervisors and merchandisers can be given a month of planned visits');

    for (const v of dto.visits) {
      if (!(await assertStoreVisible(this.prisma, owner, v.store_id)))
        throw new BadRequestException(`${owner.full_name} is not assigned to one of the selected points of sale`);
    }
    this.assertNoDuplicates(dto.visits);

    const existing = await this.prisma.visitPlan.findUnique({
      where: { user_id_year_month: { user_id: userId, year: dto.year, month: dto.month } },
      include: PLAN_INCLUDE,
    });
    const isFirstFill = !existing;
    const before = existing ? snapshotVisits(existing.visits) : [];
    const after = snapshotVisits(
      dto.visits.map((v) => ({
        planned_date: toPlannedDate(v.date),
        store_id: v.store_id,
        planned_time: v.time ?? null,
        planned_notes: v.notes ?? null,
      })),
    );
    const diff = diffSnapshots(before, after);

    const updated = await this.prisma.$transaction(async (tx) => {
      const plan =
        existing ??
        (await tx.visitPlan.create({ data: { user_id: userId, year: dto.year, month: dto.month } }));

      await tx.visit.deleteMany({ where: { plan_id: plan.id, status: VisitStatus.planned } });
      for (const v of dto.visits) {
        await this.createPlannedVisit(tx, {
          plan_id: plan.id,
          user_id: userId,
          store_id: v.store_id,
          planned_date: toPlannedDate(v.date),
          planned_time: v.time ?? null,
          planned_notes: v.notes ?? null,
          planned_by_id: actor.id,
        });
      }

      return tx.visitPlan.update({
        where: { id: plan.id },
        data: {
          status: VisitPlanStatus.approved,
          submitted_at: plan.submitted_at ?? new Date(),
          reviewed_at: new Date(),
          reviewed_by_id: actor.id,
          review_note: dto.note ?? null,
          approved_snapshot: after as unknown as Prisma.InputJsonValue,
        },
        include: PLAN_INCLUDE,
      });
    });

    await this.notifications.createForUsers([userId], {
      type: isFirstFill ? NotificationType.visit_plan_assigned : NotificationType.visit_plan_adjusted,
      title: isFirstFill
        ? `${actor.full_name} planned your visits for ${dto.month}/${dto.year}`
        : `${actor.full_name} adjusted your planned visits for ${dto.month}/${dto.year}`,
      body: dto.note ?? undefined,
      link: '/visit-planning',
      metadata: {
        planId: updated.id,
        year: dto.year,
        month: dto.month,
        actorName: actor.full_name,
        note: dto.note ?? null,
        diff,
      } as unknown as Prisma.InputJsonValue,
    });

    return updated;
  }

  // ─── Private ────────────────────────────────────────────────────────────

  /** Only a supervisor writes their own month; a merchandiser's is written for them. */
  private assertOwnsTheirMonth(actor: User) {
    if (actor.role !== UserRole.supervisor)
      throw new ForbiddenException(
        'Only supervisors plan their own month — a merchandiser’s month is planned for them',
      );
  }

  private async loadEditablePlannedVisit(visitId: string) {
    const visit = await this.prisma.visit.findUnique({ where: { id: visitId }, include: { plan: true } });
    if (!visit || !visit.plan) throw new NotFoundException('Planned visit not found');
    if (visit.status !== VisitStatus.planned)
      throw new ConflictException('This visit has already started — it can no longer be re-planned');
    return visit;
  }

  private async getOrCreateDraft(userId: string, year: number, month: number) {
    const existing = await this.prisma.visitPlan.findUnique({
      where: { user_id_year_month: { user_id: userId, year, month } },
    });
    if (existing) return existing;
    return this.prisma.visitPlan.create({ data: { user_id: userId, year, month } });
  }

  /**
   * Creates one planned visit, turning the unique-index violation into the
   * message the rule actually is: nobody visits the same POS twice in a day.
   */
  private async createPlannedVisit(
    client: Pick<PrismaService, 'visit'> | Prisma.TransactionClient,
    data: {
      plan_id: string;
      user_id: string;
      store_id: string;
      planned_date: Date;
      planned_time: string | null;
      planned_notes: string | null;
      planned_by_id: string;
    },
  ) {
    try {
      return await client.visit.create({ data: { ...data, status: VisitStatus.planned } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')
        throw new ConflictException(
          'That day already holds this point of sale, or another one at the same time',
        );
      throw err;
    }
  }

  /**
   * The two rules a planned day obeys, checked before the write so the error
   * names the actual clash rather than surfacing a raw index violation:
   *   • the same point of sale is never visited twice in one day;
   *   • no two points of sale claim the same time slot — nobody is in two
   *     places at once.
   */
  private async guardDuplicate(
    userId: string,
    date: Date,
    storeId: string,
    time?: string | null,
    exceptVisitId?: string,
  ) {
    const sameDay = await this.prisma.visit.findMany({
      where: {
        user_id: userId,
        planned_date: date,
        ...(exceptVisitId && { id: { not: exceptVisitId } }),
      },
      select: { store_id: true, planned_time: true, store: { select: { name: true } } },
    });

    if (sameDay.some((v) => v.store_id === storeId))
      throw new ConflictException('That point of sale is already planned for that day');

    if (time) {
      const busy = sameDay.find((v) => v.planned_time === time);
      if (busy)
        throw new ConflictException(
          `${time} is already taken that day by ${busy.store.name} — two points of sale cannot share a time slot`,
        );
    }
  }

  /** Both rules, applied inside a single whole-month payload before it is written. */
  private assertNoDuplicates(visits: PlanVisitDto[]) {
    const byStore = new Set<string>();
    const bySlot = new Set<string>();
    for (const v of visits) {
      const day = v.date.slice(0, 10);
      const storeKey = `${day}__${v.store_id}`;
      if (byStore.has(storeKey))
        throw new BadRequestException('The same point of sale cannot be planned twice on the same day');
      byStore.add(storeKey);

      if (!v.time) continue;
      const slotKey = `${day}__${v.time}`;
      if (bySlot.has(slotKey))
        throw new BadRequestException(
          `Two points of sale are both planned for ${v.time} on ${day} — a time slot holds one visit`,
        );
      bySlot.add(slotKey);
    }
  }

  /** After any write by the owner: an `approved` month bounces back to `pending_review` with a diff. */
  private async afterPlanChange(
    plan: {
      id: string;
      status: VisitPlanStatus;
      year: number;
      month: number;
      approved_snapshot: Prisma.JsonValue | null;
    },
    actor: User,
  ) {
    const fresh = await this.prisma.visitPlan.findUniqueOrThrow({ where: { id: plan.id }, include: PLAN_INCLUDE });
    if (plan.status !== VisitPlanStatus.approved) return fresh;

    const before = (plan.approved_snapshot as unknown as PlannedSnapshot[]) ?? [];
    const diff = diffSnapshots(before, snapshotVisits(fresh.visits));

    const reverted = await this.prisma.visitPlan.update({
      where: { id: plan.id },
      data: { status: VisitPlanStatus.pending_review, submitted_at: new Date() },
      include: PLAN_INCLUDE,
    });

    await this.notifyReviewers(NotificationType.visit_plan_changed, fresh, actor, diff);
    return reverted;
  }

  private async notifyReviewers(
    type: NotificationType,
    plan: { id: string; year: number; month: number },
    actor: User,
    diff?: ReturnType<typeof diffSnapshots>,
  ) {
    const reviewers = await this.prisma.user.findMany({
      where: { custom_role: { permissions: { some: { permission: { code: 'visit_plans.review' } } } } },
      select: { id: true },
    });
    if (!reviewers.length) return;

    const title =
      type === NotificationType.visit_plan_changed
        ? `${actor.full_name} changed their approved plan for ${plan.month}/${plan.year}`
        : `${actor.full_name} submitted their planned visits for ${plan.month}/${plan.year}`;

    await this.notifications.createForUsers(
      reviewers.map((r) => r.id),
      {
        type,
        title,
        link: `/visit-planning?tab=review&planId=${plan.id}`,
        metadata: {
          planId: plan.id,
          year: plan.year,
          month: plan.month,
          actorName: actor.full_name,
          ...(diff && { diff }),
        } as unknown as Prisma.InputJsonValue,
      },
    );
  }
}

export type { PlanWithVisits };
