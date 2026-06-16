import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User, UserRole, VisitStatus } from '@prisma/client';
import { getDistanceMeters } from '../common/utils/haversine';
import { PrismaService } from '../prisma/prisma.service';
import { CheckinDto } from './dto/checkin.dto';
import { CheckoutDto } from './dto/checkout.dto';
import { FindVisitsDto } from './dto/find-visits.dto';

const CHECKIN_RADIUS_METERS = 200;

const VISIT_INCLUDE = {
  user: { select: { id: true, full_name: true, email: true, role: true } },
  store: { include: { region: true } },
  auditItems: {
    include: { product: true },
  },
} as const;

@Injectable()
export class VisitsService {
  constructor(private readonly prisma: PrismaService) {}

  async checkin(dto: CheckinDto, user: User) {
    const store = await this.prisma.store.findUnique({ where: { id: dto.store_id } });
    if (!store) throw new NotFoundException('Store not found');

    // Verify the user is assigned to this store (supervisor/merchandiser)
    if (user.role === UserRole.supervisor || user.role === UserRole.merchandiser) {
      const assignment = await this.prisma.userStore.findFirst({
        where: { user_id: user.id, store_id: dto.store_id },
      });
      if (!assignment) throw new ForbiddenException('You are not assigned to this store');
    }

    // Enforce one open visit at a time
    const openVisit = await this.prisma.visit.findFirst({
      where: { user_id: user.id, status: VisitStatus.open },
    });
    if (openVisit) throw new ConflictException('You already have an open visit');

    // Haversine distance check — store must have GPS coordinates
    if (store.latitude == null || store.longitude == null) {
      throw new BadRequestException('Store has no GPS coordinates configured');
    }

    const distance = getDistanceMeters(
      dto.lat,
      dto.lng,
      Number(store.latitude),
      Number(store.longitude),
    );
    if (distance > CHECKIN_RADIUS_METERS) {
      throw new BadRequestException(
        `You are ${Math.round(distance)}m from the store. Must be within ${CHECKIN_RADIUS_METERS}m to check in.`,
      );
    }

    const visit = await this.prisma.visit.create({
      data: {
        user_id: user.id,
        store_id: dto.store_id,
        checkin_time: dto.checkin_at ? new Date(dto.checkin_at) : new Date(),
        checkin_lat: dto.lat,
        checkin_lng: dto.lng,
        status: VisitStatus.open,
      },
      include: VISIT_INCLUDE,
    });
    return this.serializeVisit(visit);
  }

  async checkout(dto: CheckoutDto, user: User) {
    const visit = await this.prisma.visit.findUnique({ where: { id: dto.visit_id } });
    if (!visit) throw new NotFoundException('Visit not found');
    if (visit.user_id !== user.id) throw new ForbiddenException('This visit does not belong to you');
    if (visit.status === VisitStatus.completed) {
      throw new ConflictException('Visit is already completed');
    }

    const updated = await this.prisma.visit.update({
      where: { id: dto.visit_id },
      data: {
        status: VisitStatus.completed,
        checkout_time: dto.checkout_at ? new Date(dto.checkout_at) : new Date(),
        checkout_lat: dto.lat,
        checkout_lng: dto.lng,
      },
      include: VISIT_INCLUDE,
    });
    return this.serializeVisit(updated);
  }

  async findAll(user: User, query: FindVisitsDto) {
    const where = this.buildFilter(user, query);
    const visits = await this.prisma.visit.findMany({
      where,
      include: VISIT_INCLUDE,
      orderBy: { checkin_time: 'desc' },
    });
    return visits.map((v) => this.serializeVisit(v));
  }

  async findOne(id: string, user: User) {
    const visit = await this.prisma.visit.findUnique({
      where: { id },
      include: VISIT_INCLUDE,
    });
    if (!visit) throw new NotFoundException('Visit not found');
    this.assertReadAccess(visit, user);
    return this.serializeVisit(visit);
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private serializeVisit<T extends { checkin_time: Date; checkout_time: Date | null }>(v: T) {
    return { ...v, checkin_at: v.checkin_time, checkout_at: v.checkout_time };
  }

  private buildFilter(user: User, query: FindVisitsDto) {
    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.store_id) where.store_id = query.store_id;

    if (user.role === UserRole.super_admin) return where;

    if (user.role === UserRole.admin) {
      where.store = { region_id: user.region_id ?? undefined };
      return where;
    }

    // supervisor / merchandiser — own visits only
    where.user_id = user.id;
    return where;
  }

  private assertReadAccess(visit: { user_id: string; store: { region_id: string | null } }, user: User) {
    if (user.role === UserRole.super_admin) return;
    if (user.role === UserRole.admin) {
      if (visit.store.region_id !== user.region_id)
        throw new ForbiddenException('Access to this visit is not allowed');
      return;
    }
    if (visit.user_id !== user.id)
      throw new ForbiddenException('Access to this visit is not allowed');
  }
}
