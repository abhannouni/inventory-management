import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditItemStatus, User, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { adminAssignedStoreIds } from '../stores/store-scope';
import { BulkAuditDto, BulkAuditItemDto } from './dto/bulk-audit.dto';
import { CreateAuditItemDto } from './dto/create-audit-item.dto';
import { FindAuditItemsDto } from './dto/find-audit-items.dto';
import { UpdateAuditItemDto } from './dto/update-audit-item.dto';

const ITEM_INCLUDE = {
  product: true,
  visit: { include: { store: true } },
} as const;

@Injectable()
export class AuditItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAuditItemDto, user: User) {
    const visit = await this.getVisit(dto.visit_id, user);
    const { expected_qty, productStoreId } = await this.resolveProductStore(
      dto.product_id,
      visit.store_id,
    );

    return this.prisma.auditItem.create({
      data: {
        visit_id: dto.visit_id,
        product_id: dto.product_id,
        qty_found: dto.qty_found,
        expected_qty,
        variance: dto.qty_found - expected_qty,
        status: deriveStatus(dto.qty_found, expected_qty),
        photo_url: dto.photo_url,
        notes: dto.notes,
      },
      include: ITEM_INCLUDE,
    });
  }

  async bulk(dto: BulkAuditDto, user: User) {
    const visit = await this.getVisit(dto.visit_id, user);

    // Resolve expected_qty for all products in one query
    const productIds = dto.items.map((i) => i.product_id);
    const productStores = await this.prisma.productStore.findMany({
      where: { store_id: visit.store_id, product_id: { in: productIds } },
    });
    const psMap = new Map(productStores.map((ps) => [ps.product_id, ps.expected_qty]));

    const missing = productIds.filter((id) => !psMap.has(id));
    if (missing.length) {
      throw new BadRequestException(
        `Products not assigned to this store: ${missing.join(', ')}`,
      );
    }

    // Upsert each item — allows re-submitting the full scan to correct mistakes
    const results = await this.prisma.$transaction(
      dto.items.map((item) =>
        this.upsertItem(dto.visit_id, item, psMap.get(item.product_id)!),
      ),
    );

    return results;
  }

  async findAll(user: User, query: FindAuditItemsDto) {
    const visit = await this.prisma.visit.findUnique({
      where: { id: query.visit_id },
      include: { store: true },
    });
    if (!visit) throw new NotFoundException('Visit not found');
    await this.assertReadAccess(visit, user);

    return this.prisma.auditItem.findMany({
      where: { visit_id: query.visit_id },
      include: ITEM_INCLUDE,
      orderBy: { product: { name: 'asc' } },
    });
  }

  async findOne(id: string, user: User) {
    const item = await this.prisma.auditItem.findUnique({
      where: { id },
      include: ITEM_INCLUDE,
    });
    if (!item) throw new NotFoundException('Audit item not found');
    await this.assertReadAccess(item.visit, user);
    return item;
  }

  async update(id: string, dto: UpdateAuditItemDto, user: User) {
    const item = await this.prisma.auditItem.findUnique({
      where: { id },
      include: { visit: true },
    });
    if (!item) throw new NotFoundException('Audit item not found');
    this.assertOwnsVisit(item.visit, user);

    const qty_found = dto.qty_found ?? item.qty_found;
    const variance = qty_found - item.expected_qty;

    return this.prisma.auditItem.update({
      where: { id },
      data: {
        qty_found,
        variance,
        status: deriveStatus(qty_found, item.expected_qty),
        ...(dto.photo_url !== undefined && { photo_url: dto.photo_url }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: ITEM_INCLUDE,
    });
  }

  async remove(id: string, user: User) {
    const item = await this.prisma.auditItem.findUnique({
      where: { id },
      include: { visit: true },
    });
    if (!item) throw new NotFoundException('Audit item not found');
    this.assertOwnsVisit(item.visit, user);
    await this.prisma.auditItem.delete({ where: { id } });
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private async getVisit(visitId: string, user: User) {
    const visit = await this.prisma.visit.findUnique({
      where: { id: visitId },
      include: { store: true },
    });
    if (!visit) throw new NotFoundException('Visit not found');
    this.assertOwnsVisit(visit, user);
    return visit;
  }

  private async resolveProductStore(productId: string, storeId: string) {
    const ps = await this.prisma.productStore.findUnique({
      where: { product_id_store_id: { product_id: productId, store_id: storeId } },
    });
    if (!ps) {
      throw new BadRequestException('Product is not assigned to this store');
    }
    return { expected_qty: ps.expected_qty, productStoreId: ps.id };
  }

  private upsertItem(visitId: string, item: BulkAuditItemDto, expected_qty: number) {
    const variance = item.qty_found - expected_qty;
    const status = deriveStatus(item.qty_found, expected_qty);
    return this.prisma.auditItem.upsert({
      where: {
        visit_id_product_id: { visit_id: visitId, product_id: item.product_id },
      },
      create: {
        visit_id: visitId,
        product_id: item.product_id,
        qty_found: item.qty_found,
        expected_qty,
        variance,
        status,
        photo_url: item.photo_url,
        notes: item.notes,
      },
      update: {
        qty_found: item.qty_found,
        variance,
        status,
        ...(item.photo_url !== undefined && { photo_url: item.photo_url }),
        ...(item.notes !== undefined && { notes: item.notes }),
      },
      include: ITEM_INCLUDE,
    });
  }

  private assertOwnsVisit(visit: { user_id: string }, user: User) {
    if (user.role !== UserRole.super_admin && visit.user_id !== user.id) {
      throw new ForbiddenException('This visit does not belong to you');
    }
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

// ─── Pure helpers ────────────────────────────────────────────────────────────

function deriveStatus(qty_found: number, expected_qty: number): AuditItemStatus {
  if (qty_found === 0) return AuditItemStatus.out_of_stock;
  if (qty_found < expected_qty) return AuditItemStatus.low_stock;
  return AuditItemStatus.in_stock;
}
