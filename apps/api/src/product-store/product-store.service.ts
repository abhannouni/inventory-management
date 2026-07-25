import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { adminAssignedStoreIds } from '../stores/store-scope';
import { BulkAssignProductStoreDto } from './dto/bulk-assign-product-store.dto';
import { CreateProductStoreDto } from './dto/create-product-store.dto';
import { FindProductStoresDto } from './dto/find-product-stores.dto';
import { UpdateProductStoreDto } from './dto/update-product-store.dto';

@Injectable()
export class ProductStoreService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: User, query: FindProductStoresDto) {
    const where = await this.buildFilter(user, query);
    return this.prisma.productStore.findMany({
      where,
      include: { product: true, store: { include: { region: true } } },
      orderBy: { product: { name: 'asc' } },
    });
  }

  async findOne(id: string, user: User) {
    const ps = await this.prisma.productStore.findUnique({
      where: { id },
      include: { product: true, store: { include: { region: true } } },
    });
    if (!ps) throw new NotFoundException('Product-store assignment not found');
    await this.assertStoreAccess(ps.store_id, user);
    return ps;
  }

  async create(dto: CreateProductStoreDto, user: User) {
    await this.assertStoreWriteAccess(dto.store_id, user);

    const product = await this.prisma.product.findUnique({ where: { id: dto.product_id } });
    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.prisma.productStore.findUnique({
      where: { product_id_store_id: { product_id: dto.product_id, store_id: dto.store_id } },
    });
    if (existing) throw new ConflictException('Product already assigned to this store');

    return this.prisma.productStore.create({
      data: { product_id: dto.product_id, store_id: dto.store_id, expected_qty: dto.expected_qty },
      include: { product: true, store: { include: { region: true } } },
    });
  }

  async update(id: string, dto: UpdateProductStoreDto, user: User) {
    const ps = await this.findOrFail(id);
    await this.assertStoreWriteAccess(ps.store_id, user);

    return this.prisma.productStore.update({
      where: { id },
      data: dto,
      include: { product: true, store: { include: { region: true } } },
    });
  }

  async remove(id: string, user: User) {
    const ps = await this.findOrFail(id);
    await this.assertStoreWriteAccess(ps.store_id, user);
    await this.prisma.productStore.delete({ where: { id } });
  }

  /**
   * Replaces the full product list assigned to a store: anything already
   * assigned that isn't in `items` is removed, the rest are created or have
   * their `expected_qty` updated to match — one round trip for the whole list.
   */
  async bulkAssign(dto: BulkAssignProductStoreDto, user: User) {
    await this.assertStoreWriteAccess(dto.store_id, user);

    const existing = await this.prisma.productStore.findMany({
      where: { store_id: dto.store_id },
    });
    const existingByProduct = new Map(existing.map((e) => [e.product_id, e]));
    const desiredIds = new Set(dto.items.map((i) => i.product_id));

    await this.prisma.$transaction([
      ...existing
        .filter((e) => !desiredIds.has(e.product_id))
        .map((e) => this.prisma.productStore.delete({ where: { id: e.id } })),
      ...dto.items.map((i) => {
        const current = existingByProduct.get(i.product_id);
        return current
          ? this.prisma.productStore.update({
              where: { id: current.id },
              data: { expected_qty: i.expected_qty },
            })
          : this.prisma.productStore.create({
              data: {
                store_id: dto.store_id,
                product_id: i.product_id,
                expected_qty: i.expected_qty,
              },
            });
      }),
    ]);

    return this.prisma.productStore.findMany({
      where: { store_id: dto.store_id },
      include: { product: true, store: { include: { region: true } } },
      orderBy: { product: { name: 'asc' } },
    });
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private async buildFilter(user: User, query: FindProductStoresDto) {
    const base: Record<string, unknown> = {};
    if (query.product_id) base.product_id = query.product_id;

    if (user.role === UserRole.super_admin) {
      if (query.store_id) base.store_id = query.store_id;
      return base;
    }

    if (user.role === UserRole.admin) {
      if (query.store_id) {
        await this.assertStoreAccess(query.store_id, user);
        base.store_id = query.store_id;
      } else {
        const assigned = await adminAssignedStoreIds(this.prisma, user.id);
        if (assigned) base.store_id = { in: assigned };
        else base.store = { region_id: user.region_id ?? undefined };
      }
      return base;
    }

    // supervisor / merchandiser — intersect with assigned stores
    const assignments = await this.prisma.userStore.findMany({
      where: { user_id: user.id },
      select: { store_id: true },
    });
    const assignedIds = assignments.map((a) => a.store_id);

    if (query.store_id) {
      if (!assignedIds.includes(query.store_id))
        throw new ForbiddenException('Access to this store is not allowed');
      base.store_id = query.store_id;
    } else {
      base.store_id = { in: assignedIds };
    }
    return base;
  }

  private async assertStoreAccess(storeId: string, user: User) {
    if (user.role === UserRole.super_admin) return;

    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw new NotFoundException('Store not found');

    if (user.role === UserRole.admin) {
      const assigned = await adminAssignedStoreIds(this.prisma, user.id);
      const allowed = assigned ? assigned.includes(storeId) : store.region_id === user.region_id;
      if (!allowed) throw new ForbiddenException('Access to this store is not allowed');
      return;
    }

    const assignment = await this.prisma.userStore.findFirst({
      where: { user_id: user.id, store_id: storeId },
    });
    if (!assignment) throw new ForbiddenException('Access to this store is not allowed');
  }

  private async assertStoreWriteAccess(storeId: string, user: User) {
    if (user.role === UserRole.super_admin) return;
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw new NotFoundException('Store not found');

    if (user.role === UserRole.admin) {
      const assigned = await adminAssignedStoreIds(this.prisma, user.id);
      const allowed = assigned ? assigned.includes(storeId) : store.region_id === user.region_id;
      if (!allowed) throw new ForbiddenException('Access to this store is not allowed');
      return;
    }

    if (store.region_id !== user.region_id)
      throw new ForbiddenException('Access to this store is not allowed');
  }

  private async findOrFail(id: string) {
    const ps = await this.prisma.productStore.findUnique({ where: { id } });
    if (!ps) throw new NotFoundException('Product-store assignment not found');
    return ps;
  }
}
