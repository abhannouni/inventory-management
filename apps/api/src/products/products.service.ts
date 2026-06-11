import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: User, storeId?: string) {
    if (storeId) {
      await this.assertStoreReadAccess(storeId, user);
      return this.prisma.productStore.findMany({
        where: { store_id: storeId },
        include: { product: true, store: true },
        orderBy: { product: { name: 'asc' } },
      });
    }

    const where = await this.buildStoreFilter(user);
    return this.prisma.productStore.findMany({
      where,
      include: { product: true, store: true },
      orderBy: { product: { name: 'asc' } },
    });
  }

  async findOne(id: string, user: User) {
    const ps = await this.prisma.productStore.findUnique({
      where: { id },
      include: { product: true, store: true },
    });
    if (!ps) throw new NotFoundException('Product not found');
    await this.assertStoreReadAccess(ps.store_id, user);
    return ps;
  }

  async create(dto: CreateProductDto, user: User) {
    await this.assertStoreWriteAccess(dto.store_id, user);

    let product = await this.prisma.product.findUnique({ where: { sku: dto.sku } });
    if (!product) {
      product = await this.prisma.product.create({ data: { name: dto.name, sku: dto.sku } });
    }

    const existing = await this.prisma.productStore.findUnique({
      where: { product_id_store_id: { product_id: product.id, store_id: dto.store_id } },
    });
    if (existing) throw new ConflictException('Product already assigned to this store');

    return this.prisma.productStore.create({
      data: { product_id: product.id, store_id: dto.store_id, expected_qty: dto.expected_qty },
      include: { product: true, store: true },
    });
  }

  async update(id: string, dto: UpdateProductDto, user: User) {
    const ps = await this.findOrFail(id);
    await this.assertStoreWriteAccess(ps.store_id, user);

    if (dto.name !== undefined || dto.sku !== undefined) {
      await this.prisma.product.update({
        where: { id: ps.product_id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.sku !== undefined && { sku: dto.sku }),
        },
      });
    }

    return this.prisma.productStore.update({
      where: { id },
      data: { ...(dto.expected_qty !== undefined && { expected_qty: dto.expected_qty }) },
      include: { product: true, store: true },
    });
  }

  async remove(id: string, user: User) {
    const ps = await this.findOrFail(id);
    await this.assertStoreWriteAccess(ps.store_id, user);
    await this.prisma.productStore.delete({ where: { id } });
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private async assertStoreReadAccess(storeId: string, user: User) {
    if (user.role === UserRole.super_admin) return;

    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw new NotFoundException('Store not found');

    if (user.role === UserRole.admin) {
      if (store.region_id !== user.region_id)
        throw new ForbiddenException('Access to this store is not allowed');
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

    if (store.region_id !== user.region_id)
      throw new ForbiddenException('Access to this store is not allowed');
  }

  private async buildStoreFilter(user: User) {
    if (user.role === UserRole.super_admin) return {};

    if (user.role === UserRole.admin) {
      return { store: { region_id: user.region_id ?? undefined } };
    }

    const assignments = await this.prisma.userStore.findMany({
      where: { user_id: user.id },
      select: { store_id: true },
    });
    return { store_id: { in: assignments.map((a) => a.store_id) } };
  }

  private async findOrFail(id: string) {
    const ps = await this.prisma.productStore.findUnique({ where: { id } });
    if (!ps) throw new NotFoundException('Product not found');
    return ps;
  }
}
