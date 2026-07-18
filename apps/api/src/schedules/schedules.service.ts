import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ScheduleStatus, User, UserRole } from '@prisma/client';
import { PermissionsService } from '../auth/permissions.service';
import { PrismaService } from '../prisma/prisma.service';
import { adminAssignedStoreIds, assertStoreVisible } from '../stores/store-scope';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { FindSchedulesDto } from './dto/find-schedules.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

/** A supervisor may plan for themself or for a merchandiser on their direct team. */
function isInSupervisorScope(actor: User, targetUser: { id: string; supervisor_id: string | null }) {
  return targetUser.id === actor.id || targetUser.supervisor_id === actor.id;
}

const SCHEDULE_INCLUDE = {
  user: { select: { id: true, full_name: true, email: true, role: true } },
  store: { select: { id: true, name: true, address: true, region_id: true } },
  created_by: { select: { id: true, full_name: true, role: true } },
} as const;

@Injectable()
export class SchedulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
  ) {}

  async create(dto: CreateScheduleDto, actor: User) {
    // Coarse "can this caller create schedules at all" is the controller's
    // `@RequirePermissions('schedules.create')` guard — no role check needed here.

    // A supervisor may only plan visits for themself — team planning is an
    // admin/super_admin responsibility. Ignore any user_id they send and
    // reject an explicit attempt to target someone else outright.
    if (actor.role === UserRole.supervisor) {
      if (dto.user_id && dto.user_id !== actor.id)
        throw new ForbiddenException('Supervisors can only plan visits for themselves');
    } else if (!dto.user_id) {
      throw new BadRequestException('user_id is required');
    }
    const targetUserId = actor.role === UserRole.supervisor ? actor.id : dto.user_id!;

    const [targetUser, store] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: targetUserId } }),
      this.prisma.store.findUnique({ where: { id: dto.store_id } }),
    ]);
    if (!targetUser) throw new NotFoundException('User not found');
    if (!store) throw new NotFoundException('Store not found');

    if (actor.role === UserRole.supervisor) {
      if (!(await assertStoreVisible(this.prisma, actor, dto.store_id)))
        throw new ForbiddenException('You can only schedule visits at a POS you are responsible for');
    }

    return this.prisma.schedule.create({
      data: {
        user_id: targetUserId,
        store_id: dto.store_id,
        created_by_id: actor.id,
        scheduled_at: new Date(dto.scheduled_at),
        notes: dto.notes ?? null,
        status: ScheduleStatus.pending,
      },
      include: SCHEDULE_INCLUDE,
    });
  }

  async findAll(actor: User, query: FindSchedulesDto) {
    return this.prisma.schedule.findMany({
      where: await this.buildWhere(actor, query),
      include: SCHEDULE_INCLUDE,
      orderBy: { scheduled_at: 'asc' },
    });
  }

  async update(id: string, dto: UpdateScheduleDto, actor: User) {
    const record = await this.prisma.schedule.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, supervisor_id: true, region_id: true } },
        store: { select: { region_id: true } },
      },
    });
    if (!record) throw new NotFoundException('Schedule not found');

    // Whether this caller can edit ANY schedule in their scope (region-limited
    // below) is decided by holding `schedules.update` — not by role identity.
    // Someone without it can still act on their OWN schedule in one narrow way:
    // marking it completed. That's a self-service action tied to ownership of
    // the record, not a grantable permission, so it stays available regardless
    // of the caller's permission set.
    const granted = await this.permissions.forUser(actor);
    const canManageSchedules = granted.has('schedules.update');

    if (!canManageSchedules) {
      if (record.user_id !== actor.id)
        throw new ForbiddenException('You can only update your own schedule');

      const { status, ...rest } = dto;
      const hasOtherFields = Object.values(rest).some((v) => v !== undefined);
      if (hasOtherFields || status !== ScheduleStatus.completed)
        throw new ForbiddenException('You can only mark your own visit as completed');

      return this.prisma.schedule.update({
        where: { id },
        data: { status: ScheduleStatus.completed },
        include: SCHEDULE_INCLUDE,
      });
    }

    if (actor.role === UserRole.supervisor) {
      if (!isInSupervisorScope(actor, record.user))
        throw new ForbiddenException('Access denied: schedule belongs to someone outside your team');
      if (
        dto.store_id !== undefined &&
        !(await assertStoreVisible(this.prisma, actor, dto.store_id))
      )
        throw new ForbiddenException('You can only schedule visits at a POS you are responsible for');
    }

    if (actor.role === UserRole.admin) await this.assertAdminScheduleAccess(record, actor);

    return this.prisma.schedule.update({
      where: { id },
      data: {
        ...(dto.store_id !== undefined && { store_id: dto.store_id }),
        ...(dto.scheduled_at !== undefined && { scheduled_at: new Date(dto.scheduled_at) }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
      include: SCHEDULE_INCLUDE,
    });
  }

  async remove(id: string, actor: User) {
    // Coarse "can this caller delete schedules at all" is the controller's
    // `@RequirePermissions('schedules.delete')` guard — no role check needed here.

    const record = await this.prisma.schedule.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, supervisor_id: true } },
        store: { select: { region_id: true } },
      },
    });
    if (!record) throw new NotFoundException('Schedule not found');

    if (actor.role === UserRole.supervisor && !isInSupervisorScope(actor, record.user))
      throw new ForbiddenException('Access denied: schedule belongs to someone outside your team');

    if (actor.role === UserRole.admin) await this.assertAdminScheduleAccess(record, actor);

    await this.prisma.schedule.delete({ where: { id } });
    return { id };
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  /** Admin's PDV assignment (if any) overrides the region-wide default. */
  private async assertAdminScheduleAccess(
    record: { store_id: string; store: { region_id: string | null } },
    actor: User,
  ) {
    const assigned = await adminAssignedStoreIds(this.prisma, actor.id);
    const allowed = assigned
      ? assigned.includes(record.store_id)
      : record.store.region_id === actor.region_id;
    if (!allowed) throw new ForbiddenException('Access denied: store is outside your assigned scope');
  }

  private async buildWhere(actor: User, query: FindSchedulesDto): Promise<Record<string, unknown>> {
    const where: Record<string, unknown> = {};

    if (query.status) where.status = query.status;
    if (query.user_id) where.user_id = query.user_id;

    if (query.month) {
      const [y, m] = query.month.split('-').map(Number);
      where.scheduled_at = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
    }

    if (actor.role === UserRole.super_admin) return where;

    if (actor.role === UserRole.admin) {
      const assigned = await adminAssignedStoreIds(this.prisma, actor.id);
      where.store_id = assigned ? { in: assigned } : undefined;
      if (!assigned) where.store = { region_id: actor.region_id ?? undefined };
      return where;
    }

    if (actor.role === UserRole.supervisor) {
      // Own schedules plus those of the merchandisers on their direct team.
      where.user = { OR: [{ id: actor.id }, { supervisor_id: actor.id }] };
      return where;
    }

    // merchandiser: own schedules only
    where.user_id = actor.id;
    return where;
  }
}
