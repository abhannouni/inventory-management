import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma, User } from '@prisma/client';
import {
  paginated,
  safeOrderBy,
  toSkipTake,
} from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { assertStoreVisible, visibleStoresWhere } from '../stores/store-scope';
import {
  CancelOrderDto,
  CreateOrderDto,
  FindOrdersDto,
  ORDER_SORT_FIELDS,
} from './dto/order.dto';
import { documentNumber, lineAmounts, orderTotals } from './order-totals.util';

const PERSON = { select: { id: true, full_name: true } } as const;

const ORDER_DETAIL = {
  items: { orderBy: { position: 'asc' } },
  invoice: true,
  store: { include: { region: { select: { id: true, name: true } } } },
  created_by: PERSON,
  cancelled_by: PERSON,
} satisfies Prisma.OrderInclude;

const ORDER_LIST = {
  invoice: { select: { id: true, number: true, issued_at: true } },
  store: { select: { id: true, name: true, city: true } },
  created_by: PERSON,
  _count: { select: { items: true } },
} satisfies Prisma.OrderInclude;

/** What the invoice keeps of the POS — frozen at the moment it was issued. */
export interface StoreSnapshot {
  id: string;
  name: string;
  brand: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  region: string | null;
}

/**
 * Passage de commande: orders placed for a point of sale, each confirmed with
 * its own invoice in the same transaction. Orders are never edited or deleted
 * once confirmed — only cancelled — so every invoice stays on record.
 *
 * Visibility follows the POS module exactly (`visibleStoresWhere`): a user
 * sees, and orders for, only the points of sale they may see.
 */
@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: User, q: FindOrdersDto) {
    const where: Prisma.OrderWhereInput = {
      AND: [
        await this.scope(user),
        q.store_id ? { store_id: q.store_id } : {},
        q.status ? { status: q.status } : {},
        q.search
          ? {
              OR: [
                { number: { contains: q.search, mode: 'insensitive' } },
                {
                  invoice: {
                    number: { contains: q.search, mode: 'insensitive' },
                  },
                },
                {
                  store: { name: { contains: q.search, mode: 'insensitive' } },
                },
              ],
            }
          : {},
      ],
    };
    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: ORDER_LIST,
        orderBy: safeOrderBy(q.sort_by, q.sort_dir, ORDER_SORT_FIELDS, {
          created_at: 'desc',
        }),
        ...toSkipTake(q),
      }),
      this.prisma.order.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async findOne(user: User, id: string) {
    // Out-of-scope reads as not found — no probing other POS's orders by id.
    const order = await this.prisma.order.findFirst({
      where: { AND: [{ id }, await this.scope(user)] },
      include: ORDER_DETAIL,
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  /**
   * The last unit price and TVA rate used for each product — at this POS when
   * it has been ordered there before, else anywhere — to prefill a new order.
   */
  async lastPrices(user: User, storeId: string) {
    await this.assertCanOrderFor(user, storeId);
    const select = {
      product_id: true,
      unit_price: true,
      tva_rate: true,
    } as const;
    const confirmed = { status: OrderStatus.confirmed };
    const [here, anywhere] = await Promise.all([
      this.prisma.orderItem.findMany({
        where: {
          product_id: { not: null },
          order: { ...confirmed, store_id: storeId },
        },
        distinct: ['product_id'],
        orderBy: { order: { created_at: 'desc' } },
        select,
      }),
      this.prisma.orderItem.findMany({
        where: { product_id: { not: null }, order: confirmed },
        distinct: ['product_id'],
        orderBy: { order: { created_at: 'desc' } },
        select,
      }),
    ]);
    const prices: Record<
      string,
      { unit_price: number; tva_rate: number; at_this_store: boolean }
    > = {};
    for (const [rows, atThisStore] of [
      [anywhere, false],
      [here, true],
    ] as const) {
      for (const r of rows) {
        prices[r.product_id!] = {
          unit_price: Number(r.unit_price),
          tva_rate: Number(r.tva_rate),
          at_this_store: atThisStore,
        };
      }
    }
    return prices;
  }

  /** Confirms the order and issues its invoice, atomically. */
  async create(user: User, dto: CreateOrderDto) {
    const store = await this.assertCanOrderFor(user, dto.store_id);

    const productIds = Array.from(new Set(dto.items.map((i) => i.product_id)));
    if (productIds.length !== dto.items.length) {
      throw new BadRequestException(
        'A product appears on more than one line — combine them into one',
      );
    }
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, sku: true },
    });
    if (products.length !== productIds.length)
      throw new NotFoundException('Product not found');
    const byId = new Map(products.map((p) => [p.id, p]));

    const lines = dto.items.map((item, position) => {
      const product = byId.get(item.product_id)!;
      return {
        product_id: product.id,
        product_name: product.name,
        product_sku: product.sku,
        position,
        quantity: item.quantity,
        ...lineAmounts(item),
      };
    });
    const totals = orderTotals(lines);
    const snapshot: StoreSnapshot = {
      id: store.id,
      name: store.name,
      brand: store.brand,
      address: store.address,
      city: store.city,
      postal_code: store.postal_code,
      region: store.region?.name ?? null,
    };

    const year = new Date().getFullYear();
    const write = () =>
      this.prisma.$transaction(async (tx) => {
        const [orderSeq, invoiceSeq] = await Promise.all([
          this.nextNumber(tx, `order:${year}`),
          this.nextNumber(tx, `invoice:${year}`),
        ]);
        return tx.order.create({
          data: {
            number: documentNumber('CMD', year, orderSeq),
            store_id: store.id,
            notes: dto.notes?.trim() || null,
            ...totals,
            created_by_id: user.id,
            items: { create: lines },
            invoice: {
              create: {
                number: documentNumber('FAC', year, invoiceSeq),
                store_snapshot: snapshot as unknown as Prisma.InputJsonObject,
              },
            },
          },
          include: ORDER_DETAIL,
        });
      });

    try {
      return await write();
    } catch (e) {
      // Two first-ever orders of a year racing to create the counter row:
      // the loser retries once against the row the winner created.
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      )
        return write();
      throw e;
    }
  }

  async cancel(user: User, id: string, dto: CancelOrderDto) {
    const order = await this.findOne(user, id);
    if (order.status === OrderStatus.cancelled) {
      throw new ConflictException('This order is already cancelled');
    }
    return this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.cancelled,
        cancelled_at: new Date(),
        cancelled_by_id: user.id,
        cancel_reason: dto.reason?.trim() || null,
      },
      include: ORDER_DETAIL,
    });
  }

  // ─── Internals ───────────────────────────────────────────────────────────

  /**
   * Orders whose POS the user may see. A super admin also sees orders whose
   * POS has since been deleted (`store_id` null) — nobody else can.
   */
  private async scope(user: User): Promise<Prisma.OrderWhereInput> {
    const stores = await visibleStoresWhere(this.prisma, user);
    return Object.keys(stores).length ? { store: stores } : {};
  }

  private async assertCanOrderFor(user: User, storeId: string) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      include: { region: { select: { name: true } } },
    });
    if (!store || !(await assertStoreVisible(this.prisma, user, storeId))) {
      throw new NotFoundException('Point of sale not found');
    }
    if (!store.is_active) {
      throw new ForbiddenException(
        'This point of sale is inactive — orders cannot be placed for it',
      );
    }
    return store;
  }

  /** Row-locking increment, so concurrent orders never share a number. */
  private async nextNumber(tx: Prisma.TransactionClient, key: string) {
    const counter = await tx.documentCounter.upsert({
      where: { key },
      create: { key, value: 1 },
      update: { value: { increment: 1 } },
    });
    return counter.value;
  }
}
