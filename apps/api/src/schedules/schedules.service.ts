import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ScheduleStatus, User, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { FindSchedulesDto } from './dto/find-schedules.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

const SCHEDULE_INCLUDE = {
  user: { select: { id: true, full_name: true, email: true, role: true } },
  store: { select: { id: true, name: true, address: true, region_id: true } },
  created_by: { select: { id: true, full_name: true, role: true } },
} as const;

@Injectable()
export class SchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateScheduleDto, actor: User) {
    if (actor.role === UserRole.merchandiser)
      throw new ForbiddenException('Merchandisers cannot create schedules');

    const [targetUser, store] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: dto.user_id } }),
      this.prisma.store.findUnique({ where: { id: dto.store_id } }),
    ]);
    if (!targetUser) throw new NotFoundException('User not found');
    if (!store) throw new NotFoundException('Store not found');

    if (actor.role === UserRole.supervisor && targetUser.region_id !== actor.region_id)
      throw new ForbiddenException('You can only schedule visits for users in your region');

    return this.prisma.schedule.create({
      data: {
        user_id: dto.user_id,
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
      where: this.buildWhere(actor, query),
      include: SCHEDULE_INCLUDE,
      orderBy: { scheduled_at: 'asc' },
    });
  }

  async update(id: string, dto: UpdateScheduleDto, actor: User) {
    if (actor.role === UserRole.merchandiser)
      throw new ForbiddenException('Merchandisers cannot modify schedules');

    const record = await this.prisma.schedule.findUnique({
      where: { id },
      include: {
        user: { select: { region_id: true } },
        store: { select: { region_id: true } },
      },
    });
    if (!record) throw new NotFoundException('Schedule not found');

    if (actor.role === UserRole.supervisor && record.user.region_id !== actor.region_id)
      throw new ForbiddenException('Access denied: schedule belongs to a different region');

    if (actor.role === UserRole.admin && record.store.region_id !== actor.region_id)
      throw new ForbiddenException('Access denied: store is outside your region');

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
    if (actor.role === UserRole.merchandiser)
      throw new ForbiddenException('Merchandisers cannot delete schedules');

    const record = await this.prisma.schedule.findUnique({
      where: { id },
      include: {
        user: { select: { region_id: true } },
        store: { select: { region_id: true } },
      },
    });
    if (!record) throw new NotFoundException('Schedule not found');

    if (actor.role === UserRole.supervisor && record.user.region_id !== actor.region_id)
      throw new ForbiddenException('Access denied: schedule belongs to a different region');

    if (actor.role === UserRole.admin && record.store.region_id !== actor.region_id)
      throw new ForbiddenException('Access denied: store is outside your region');

    await this.prisma.schedule.delete({ where: { id } });
    return { id };
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  private buildWhere(actor: User, query: FindSchedulesDto): Record<string, unknown> {
    const where: Record<string, unknown> = {};

    if (query.status) where.status = query.status;
    if (query.user_id) where.user_id = query.user_id;

    if (query.month) {
      const [y, m] = query.month.split('-').map(Number);
      where.scheduled_at = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
    }

    if (actor.role === UserRole.super_admin) return where;

    if (actor.role === UserRole.admin) {
      where.store = { region_id: actor.region_id ?? undefined };
      return where;
    }

    if (actor.role === UserRole.supervisor) {
      where.user = { region_id: actor.region_id ?? undefined };
      return where;
    }

    // merchandiser: own schedules only
    where.user_id = actor.id;
    return where;
  }
}
