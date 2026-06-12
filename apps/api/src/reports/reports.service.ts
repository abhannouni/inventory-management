import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditItemStatus, User, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReportFiltersDto } from './dto/report-filters.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── GET /reports/visits ────────────────────────────────────────────────────

  async visitsReport(user: User, filters: ReportFiltersDto) {
    const visitWhere = await this.buildVisitWhere(user, filters);

    const visits = await this.prisma.visit.findMany({
      where: visitWhere,
      include: {
        user: { select: { id: true, full_name: true, role: true } },
        store: { include: { region: true } },
        auditItems: true,
      },
      orderBy: { checkin_time: 'desc' },
    });

    return visits.map((v) => ({
      id: v.id,
      status: v.status,
      checkin_time: v.checkin_time,
      checkout_time: v.checkout_time,
      user: v.user,
      store: v.store,
      summary: buildSummary(v.auditItems),
    }));
  }

  // ─── GET /reports/stores/:id ─────────────────────────────────────────────────

  async storeReport(storeId: string, user: User, filters: ReportFiltersDto) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      include: { region: true },
    });
    if (!store) throw new NotFoundException('Store not found');
    this.assertStoreAccess(store, user);

    const dateFilter = buildDateFilter(filters);

    const visits = await this.prisma.visit.findMany({
      where: {
        store_id: storeId,
        ...(filters.status && { status: filters.status }),
        ...dateFilter,
      },
      include: {
        user: { select: { id: true, full_name: true, role: true } },
        auditItems: { include: { product: true } },
      },
      orderBy: { checkin_time: 'desc' },
    });

    const auditHistory = visits.map((v) => ({
      id: v.id,
      status: v.status,
      checkin_time: v.checkin_time,
      checkout_time: v.checkout_time,
      user: v.user,
      summary: buildSummary(v.auditItems),
      items: v.auditItems.map((item) => ({
        id: item.id,
        product: item.product,
        qty_found: item.qty_found,
        expected_qty: item.expected_qty,
        variance: item.variance,
        status: item.status,
        photo_url: item.photo_url,
        notes: item.notes,
      })),
    }));

    return { store, visits: auditHistory };
  }

  // ─── GET /reports/products/:id ───────────────────────────────────────────────

  async productReport(productId: string, user: User, filters: ReportFiltersDto) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    const storeScope = await this.buildStoreScope(user);
    const dateFilter = buildDateFilter(filters);

    const auditItems = await this.prisma.auditItem.findMany({
      where: {
        product_id: productId,
        visit: {
          ...storeScope,
          ...(filters.status && { status: filters.status }),
          ...(filters.store_id && { store_id: filters.store_id }),
          ...dateFilter,
        },
      },
      include: {
        visit: {
          include: {
            user: { select: { id: true, full_name: true, role: true } },
            store: { include: { region: true } },
          },
        },
      },
      orderBy: { visit: { checkin_time: 'desc' } },
    });

    const totalScans = auditItems.length;
    const avgQtyFound =
      totalScans > 0
        ? Math.round(auditItems.reduce((s, i) => s + i.qty_found, 0) / totalScans)
        : 0;
    const outOfStockCount = auditItems.filter(
      (i) => i.status === AuditItemStatus.out_of_stock,
    ).length;
    const lowStockCount = auditItems.filter(
      (i) => i.status === AuditItemStatus.low_stock,
    ).length;

    return {
      product,
      summary: { totalScans, avgQtyFound, outOfStockCount, lowStockCount },
      history: auditItems.map((item) => ({
        id: item.id,
        qty_found: item.qty_found,
        expected_qty: item.expected_qty,
        variance: item.variance,
        status: item.status,
        photo_url: item.photo_url,
        notes: item.notes,
        visit: {
          id: item.visit.id,
          checkin_time: item.visit.checkin_time,
          status: item.visit.status,
          user: item.visit.user,
          store: item.visit.store,
        },
      })),
    };
  }

  // ─── Scope builders ──────────────────────────────────────────────────────────

  private async buildVisitWhere(user: User, filters: ReportFiltersDto) {
    const dateFilter = buildDateFilter(filters);
    const base: Record<string, unknown> = {
      ...(filters.status && { status: filters.status }),
      ...(filters.store_id && { store_id: filters.store_id }),
      ...dateFilter,
    };

    if (user.role === UserRole.super_admin) return base;

    if (user.role === UserRole.admin) {
      return { ...base, store: { region_id: user.region_id ?? undefined } };
    }

    if (user.role === UserRole.supervisor) {
      const stores = await this.prisma.userStore.findMany({
        where: { user_id: user.id },
        select: { store_id: true },
      });
      return { ...base, store_id: { in: stores.map((s) => s.store_id) } };
    }

    // merchandiser — own visits only
    return { ...base, user_id: user.id };
  }

  private async buildStoreScope(user: User) {
    if (user.role === UserRole.super_admin) return {};
    if (user.role === UserRole.admin) {
      return { store: { region_id: user.region_id ?? undefined } };
    }
    if (user.role === UserRole.supervisor) {
      const stores = await this.prisma.userStore.findMany({
        where: { user_id: user.id },
        select: { store_id: true },
      });
      return { store_id: { in: stores.map((s) => s.store_id) } };
    }
    return { user_id: user.id };
  }

  private assertStoreAccess(store: { region_id: string | null }, user: User) {
    if (user.role === UserRole.super_admin) return;
    if (user.role === UserRole.admin && store.region_id !== user.region_id) {
      throw new ForbiddenException('Access to this store is not allowed');
    }
  }
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function buildSummary(auditItems: { status: AuditItemStatus }[]) {
  const total = auditItems.length;
  const outOfStock = auditItems.filter((i) => i.status === AuditItemStatus.out_of_stock).length;
  const lowStock = auditItems.filter((i) => i.status === AuditItemStatus.low_stock).length;
  const inStock = auditItems.filter((i) => i.status === AuditItemStatus.in_stock).length;
  const completionPct = total === 0 ? 0 : Math.round((inStock / total) * 100);

  return { total, inStock, lowStock, outOfStock, completionPct };
}

function buildDateFilter(filters: ReportFiltersDto) {
  if (!filters.from && !filters.to) return {};
  return {
    checkin_time: {
      ...(filters.from && { gte: new Date(filters.from) }),
      ...(filters.to && { lte: new Date(filters.to + 'T23:59:59.999Z') }),
    },
  };
}
