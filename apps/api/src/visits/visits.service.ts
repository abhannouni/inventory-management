import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ScheduleStatus, User, UserRole, VisitStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { adminAssignedStoreIds } from '../stores/store-scope';
import { CheckinDto } from './dto/checkin.dto';
import { CheckoutDto } from './dto/checkout.dto';
import { FindVisitsDto } from './dto/find-visits.dto';
import { SubmitVisitReportDto } from './dto/submit-visit-report.dto';
import { SubmitVisitStateDto } from './dto/submit-visit-state.dto';

/** Toggled from the super_admin Settings page — see `FEATURE_FLAGS` in settings. */
const GPS_REQUIRED_FLAG = 'visits.gps_required';

/**
 * The single definition of visit duration: `checkout_at - checkin_at`, in whole seconds.
 *
 * Clamped at zero — the two timestamps both come from the server clock, but an
 * NTP step backwards between check-in and check-out could otherwise persist a
 * negative duration.
 */
export function computeDurationSeconds(checkinAt: Date, checkoutAt: Date): number {
  const ms = checkoutAt.getTime() - checkinAt.getTime();
  return Math.max(0, Math.floor(ms / 1000));
}

/** How far a merchandiser/supervisor may be from a store and still check in/out. */
export const CHECKIN_GEOFENCE_METERS = 50;

/** Great-circle distance between two lat/lng points, in meters. */
export function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const EARTH_RADIUS_METERS = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

const VISIT_INCLUDE = {
  user: { select: { id: true, full_name: true, email: true, role: true } },
  store: { include: { region: true } },
  auditItems: {
    include: { product: true },
  },
  report_cards: {
    orderBy: { position: 'asc' },
  },
} as const;

@Injectable()
export class VisitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  async checkin(dto: CheckinDto, user: User) {
    let store_id = dto.store_id;
    let scheduleId: string | undefined;

    if (dto.schedule_id) {
      const schedule = await this.prisma.schedule.findUnique({ where: { id: dto.schedule_id } });
      if (!schedule) throw new NotFoundException('Schedule not found');
      if (schedule.user_id !== user.id) throw new ForbiddenException('This schedule is not assigned to you');
      if (schedule.status !== ScheduleStatus.pending) throw new ConflictException('This schedule is not pending');
      store_id = schedule.store_id; // trust the schedule's store, not the client-supplied one
      scheduleId = schedule.id;
    }

    const store = await this.prisma.store.findUnique({ where: { id: store_id } });
    if (!store) throw new NotFoundException('Store not found');

    await this.assertWithinGeofence(store.latitude, store.longitude, dto.lat, dto.lng, store.name);

    // Verify the user is assigned to this store (supervisor/merchandiser)
    if (user.role === UserRole.supervisor || user.role === UserRole.merchandiser) {
      const assignment = await this.prisma.userStore.findFirst({
        where: { user_id: user.id, store_id },
      });
      if (!assignment) throw new ForbiddenException('You are not assigned to this store');
    }

    // Enforce one open visit at a time.
    const openVisit = await this.prisma.visit.findFirst({
      where: { user_id: user.id, status: VisitStatus.open },
    });
    if (openVisit) throw new ConflictException('You already have an open visit');

    try {
      const visit = await this.prisma.visit.create({
        data: {
          user_id: user.id,
          store_id,
          schedule_id: scheduleId,
          // The visit clock is started by the server, never by the client: a device
          // with a wrong or tampered clock must not be able to skew the duration.
          checkin_time: new Date(),
          checkin_lat: dto.lat,
          checkin_lng: dto.lng,
          status: VisitStatus.open,
        },
        include: VISIT_INCLUDE,
      });
      return {
        ...this.serializeVisit(visit),
        audit_progress: await this.auditProgress(visit.id, visit.store_id),
      };
    } catch (err) {
      // The check above can be raced by two simultaneous check-ins; the partial
      // unique index on (user_id) WHERE status = 'open' is the real guarantee.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('You already have an open visit');
      }
      throw err;
    }
  }

  /** The merchandiser's currently open visit, if any — used to resume the timer. */
  async findActive(user: User) {
    const visit = await this.prisma.visit.findFirst({
      where: { user_id: user.id, status: VisitStatus.open },
      include: VISIT_INCLUDE,
      orderBy: { checkin_time: 'desc' },
    });
    if (!visit) return null;

    return {
      ...this.serializeVisit(visit),
      audit_progress: await this.auditProgress(visit.id, visit.store_id),
    };
  }

  /**
   * Supervisor spot-check: saves the full set of report cards while the visit is
   * still open. Kept separate from checkout so the supervisor can review what
   * they entered (the "confirm" step) before the visit actually closes.
   *
   * Replaces the visit's entire card set on every call — the client always
   * submits the full, current list rather than incremental diffs.
   */
  async submitReport(id: string, dto: SubmitVisitReportDto, user: User) {
    const visit = await this.prisma.visit.findUnique({ where: { id } });
    if (!visit) throw new NotFoundException('Visit not found');
    if (visit.user_id !== user.id) throw new ForbiddenException('This visit does not belong to you');
    if (visit.status === VisitStatus.completed) {
      throw new ConflictException('Visit is already completed');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.visitReportCard.deleteMany({ where: { visit_id: id } });
      await tx.visitReportCard.createMany({
        data: dto.cards.map((card, index) => ({
          visit_id: id,
          category: card.category,
          note: card.note ?? null,
          photos: card.photos,
          position: index,
        })),
      });
      return tx.visit.findUniqueOrThrow({ where: { id }, include: VISIT_INCLUDE });
    });

    return {
      ...this.serializeVisit(updated),
      audit_progress: await this.auditProgress(updated.id, updated.store_id),
    };
  }

  /**
   * Merchandiser "before" shelf state — photo(s) + optional note, saved before
   * the product audit is shown.
   */
  submitInitialState(id: string, dto: SubmitVisitStateDto, user: User) {
    return this.saveVisitState(id, dto, user, 'initial');
  }

  /**
   * Merchandiser "after" shelf state — photo(s) + optional note, saved once the
   * product audit is done and required before checkout.
   */
  submitFinalState(id: string, dto: SubmitVisitStateDto, user: User) {
    return this.saveVisitState(id, dto, user, 'final');
  }

  private async saveVisitState(id: string, dto: SubmitVisitStateDto, user: User, stage: 'initial' | 'final') {
    const visit = await this.prisma.visit.findUnique({ where: { id } });
    if (!visit) throw new NotFoundException('Visit not found');
    if (visit.user_id !== user.id) throw new ForbiddenException('This visit does not belong to you');
    if (visit.status === VisitStatus.completed) {
      throw new ConflictException('Visit is already completed');
    }

    const updated = await this.prisma.visit.update({
      where: { id },
      data:
        stage === 'initial'
          ? { initial_note: dto.note ?? null, initial_photos: dto.photos }
          : { final_note: dto.note ?? null, final_photos: dto.photos },
      include: VISIT_INCLUDE,
    });
    return {
      ...this.serializeVisit(updated),
      audit_progress: await this.auditProgress(updated.id, updated.store_id),
    };
  }

  async checkout(dto: CheckoutDto, user: User) {
    const visit = await this.prisma.visit.findUnique({
      where: { id: dto.visit_id },
      include: { store: true },
    });
    if (!visit) throw new NotFoundException('Visit not found');
    if (visit.user_id !== user.id) throw new ForbiddenException('This visit does not belong to you');
    if (visit.status === VisitStatus.completed) {
      throw new ConflictException('Visit is already completed');
    }

    await this.assertWithinGeofence(
      visit.store.latitude,
      visit.store.longitude,
      dto.lat,
      dto.lng,
      visit.store.name,
    );

    if (user.role === UserRole.supervisor) {
      // A supervisor's visit is a spot-check report, not a product audit: it must
      // have at least one report card (photos + category) before the visit can
      // be closed.
      const cardCount = await this.prisma.visitReportCard.count({ where: { visit_id: visit.id } });
      if (cardCount === 0) {
        throw new ConflictException('Add at least one report card (photo and category) before checking out');
      }
    } else {
      // A visit is finished by doing the work, not by pressing a button: every
      // product expected at this POS must have been audited before we let the
      // merchandiser check out.
      const { audited, expected } = await this.auditProgress(visit.id, visit.store_id);
      if (expected > 0 && audited < expected) {
        throw new ConflictException(
          `Complete the audit before checking out — ${expected - audited} of ${expected} product(s) still to be recorded`,
        );
      }
      if (visit.final_photos.length === 0) {
        throw new ConflictException('Add the final state photo before checking out');
      }
    }

    // Server clock again — and the duration is derived from the two stored
    // timestamps, never from anything the client reports having counted.
    const checkoutTime = new Date();
    const durationSeconds = computeDurationSeconds(visit.checkin_time, checkoutTime);

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.visit.update({
        where: { id: dto.visit_id },
        data: {
          status: VisitStatus.completed,
          checkout_time: checkoutTime,
          checkout_lat: dto.lat,
          checkout_lng: dto.lng,
          duration_seconds: durationSeconds,
        },
        include: VISIT_INCLUDE,
      });

      if (visit.schedule_id) {
        await tx.schedule.update({
          where: { id: visit.schedule_id },
          data: { status: ScheduleStatus.completed },
        });
      }

      return result;
    });
    return this.serializeVisit(updated);
  }

  async findAll(user: User, query: FindVisitsDto) {
    const where = await this.buildFilter(user, query);
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
    await this.assertReadAccess(visit, user);

    return {
      ...this.serializeVisit(visit),
      audit_progress: await this.auditProgress(visit.id, visit.store_id),
    };
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Rejects a check-in/check-out whose device GPS falls outside the store's
   * geofence. Skipped entirely when a super_admin has turned the
   * `visits.gps_required` flag off, or when the store has no coordinates
   * configured — there is nothing to fence against in either case.
   */
  private async assertWithinGeofence(
    storeLat: Prisma.Decimal | null,
    storeLng: Prisma.Decimal | null,
    deviceLat: number | undefined,
    deviceLng: number | undefined,
    storeName: string,
  ) {
    if (!(await this.settings.isEnabled(GPS_REQUIRED_FLAG))) return;
    if (storeLat == null || storeLng == null) return;

    if (deviceLat == null || deviceLng == null) {
      throw new ForbiddenException('Location access is required to do this — enable it and try again');
    }

    const distance = haversineDistanceMeters(
      Number(storeLat),
      Number(storeLng),
      deviceLat,
      deviceLng,
    );
    if (distance > CHECKIN_GEOFENCE_METERS) {
      throw new ForbiddenException(
        `You must be within ${CHECKIN_GEOFENCE_METERS} m of ${storeName} to do this (you are ${Math.round(distance)} m away)`,
      );
    }
  }

  /**
   * How much of the visit's audit is done: how many of the products expected at
   * this POS already have an audit item recorded against the visit.
   */
  private async auditProgress(visitId: string, storeId: string) {
    const [expected, audited] = await Promise.all([
      this.prisma.productStore.count({ where: { store_id: storeId } }),
      this.prisma.auditItem.count({ where: { visit_id: visitId } }),
    ]);
    return { audited, expected, is_complete: expected === 0 || audited >= expected };
  }

  private serializeVisit<
    T extends {
      checkin_time: Date;
      checkout_time: Date | null;
      duration_seconds: number | null;
    },
  >(v: T) {
    // `elapsed_seconds` is the duration as of *now*, measured against the server
    // clock. The client seeds its ticking timer from this instead of computing
    // `Date.now() - checkin_at` itself, so a skewed device clock cannot distort
    // the displayed timer.
    const elapsed_seconds = v.checkout_time
      ? (v.duration_seconds ?? computeDurationSeconds(v.checkin_time, v.checkout_time))
      : computeDurationSeconds(v.checkin_time, new Date());

    return {
      ...v,
      checkin_at: v.checkin_time,
      checkout_at: v.checkout_time,
      elapsed_seconds,
    };
  }

  private async buildFilter(user: User, query: FindVisitsDto) {
    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.store_id) where.store_id = query.store_id;

    if (user.role === UserRole.super_admin) return where;

    if (user.role === UserRole.admin) {
      const assigned = await adminAssignedStoreIds(this.prisma, user.id);
      where.store = assigned ? { id: { in: assigned } } : { region_id: user.region_id ?? undefined };
      return where;
    }

    // supervisor / merchandiser — own visits only
    where.user_id = user.id;
    return where;
  }

  private async assertReadAccess(
    visit: { user_id: string; store: { id: string; region_id: string | null } },
    user: User,
  ) {
    if (user.role === UserRole.super_admin) return;
    if (user.role === UserRole.admin) {
      const assigned = await adminAssignedStoreIds(this.prisma, user.id);
      const allowed = assigned ? assigned.includes(visit.store.id) : visit.store.region_id === user.region_id;
      if (!allowed) throw new ForbiddenException('Access to this visit is not allowed');
      return;
    }
    if (visit.user_id !== user.id)
      throw new ForbiddenException('Access to this visit is not allowed');
  }
}
