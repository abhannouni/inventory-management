import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { adminAssignedStoreIds } from '../stores/store-scope';
import { CreateProductRequestDto } from './dto/create-product-request.dto';
import { FindProductRequestsDto } from './dto/find-product-requests.dto';
import { UpdateProductRequestDto } from './dto/update-product-request.dto';

@Injectable()
export class ProductRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: User, query: FindProductRequestsDto) {
    const where = await this.buildFilter(user, query);
    return this.prisma.productRequest.findMany({
      where,
      include: {
        store: { include: { region: true } },
        created_by: { select: { id: true, full_name: true, role: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async create(dto: CreateProductRequestDto, user: User) {
    await this.assertStoreAccess(dto.store_id, user);

    return this.prisma.productRequest.create({
      data: {
        store_id: dto.store_id,
        sous_famille: dto.sous_famille,
        width: dto.width,
        height: dto.height,
        depth: dto.depth,
        image_urls: dto.image_urls,
        created_by_id: user.id,
      },
      include: {
        store: { include: { region: true } },
        created_by: { select: { id: true, full_name: true, role: true } },
      },
    });
  }

  async update(id: string, dto: UpdateProductRequestDto, user: User) {
    const existing = await this.findOrFail(id);
    await this.assertStoreAccess(existing.store_id, user);
    if (dto.store_id) await this.assertStoreAccess(dto.store_id, user);

    return this.prisma.productRequest.update({
      where: { id },
      data: dto,
      include: {
        store: { include: { region: true } },
        created_by: { select: { id: true, full_name: true, role: true } },
      },
    });
  }

  async remove(id: string, user: User) {
    const existing = await this.findOrFail(id);
    await this.assertStoreAccess(existing.store_id, user);
    await this.prisma.productRequest.delete({ where: { id } });
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────
  // Same store-visibility rules as ProductStoreService — a request can only
  // reference a store the caller can already see.

  private async findOrFail(id: string) {
    const existing = await this.prisma.productRequest.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Product request not found');
    return existing;
  }

  private async buildFilter(user: User, query: FindProductRequestsDto) {
    const base: Record<string, unknown> = {};

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
}
