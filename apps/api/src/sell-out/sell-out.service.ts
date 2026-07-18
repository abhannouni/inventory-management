import { Injectable, NotFoundException } from '@nestjs/common';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSellOutDto } from './dto/create-sell-out.dto';

@Injectable()
export class SellOutService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.sellOut.findMany({
      include: { product: true, store: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async create(dto: CreateSellOutDto, user: User) {
    const [product, store] = await Promise.all([
      this.prisma.product.findUnique({ where: { id: dto.product_id } }),
      this.prisma.store.findUnique({ where: { id: dto.store_id } }),
    ]);
    if (!product) throw new NotFoundException('Product not found');
    if (!store) throw new NotFoundException('Store not found');

    return this.prisma.sellOut.create({
      data: {
        product_id: dto.product_id,
        store_id: dto.store_id,
        quantity: dto.quantity,
        price: dto.price,
        created_by_id: user.id,
      },
      include: { product: true, store: true },
    });
  }
}
