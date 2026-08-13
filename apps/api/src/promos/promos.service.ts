import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma, User } from '@prisma/client';
import * as XLSX from 'xlsx';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePromoDto, PromoItemInputDto } from './dto/create-promo.dto';
import { FindPromosDto } from './dto/find-promos.dto';
import { UpdatePromoItemDto } from './dto/update-promo-item.dto';
import { parsePromoRow } from './promo-import.util';

export interface PromoImportRowError {
  row: number;
  message: string;
}

export interface PromoImportResult {
  created: number;
  failed: number;
  errors: PromoImportRowError[];
}

const ITEMS_INCLUDE = { items: { include: { product: true }, orderBy: { created_at: 'asc' as const } } };

@Injectable()
export class PromosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ─── Reads ───────────────────────────────────────────────────────────────

  /** The single live promo batch — what every role sees by default. */
  async getCurrent(user: User) {
    const promo = await this.prisma.promo.findFirst({
      where: { is_active: true },
      include: ITEMS_INCLUDE,
      orderBy: { created_at: 'desc' },
    });
    if (!promo) return null;
    return this.attachOwnPictures(promo, user.id);
  }

  /** A specific historical batch — Super Admin browsing via filters. */
  async getBatch(id: string, user: User) {
    const promo = await this.findBatchOrFail(id);
    return this.attachOwnPictures(promo, user.id);
  }

  /** Every batch, newest first — feeds the Super Admin's history filter. */
  async listBatches(query: FindPromosDto) {
    const where: Prisma.PromoWhereInput = {};
    if (query.from || query.to) {
      where.created_at = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }
    if (query.search) {
      where.title = { contains: query.search, mode: 'insensitive' };
    }

    return this.prisma.promo.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        _count: { select: { items: true } },
        created_by: { select: { id: true, full_name: true } },
      },
    });
  }

  // ─── Publishing ──────────────────────────────────────────────────────────

  async create(dto: CreatePromoDto, user: User) {
    await this.assertProductsExist(dto.items.map((i) => i.product_id));
    return this.publishBatch(dto.items, dto.title, user);
  }

  async importFromFile(buffer: Buffer, user: User): Promise<PromoImportResult & { promo: unknown }> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new BadRequestException('The uploaded file has no sheets');

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], {
      defval: '',
    });
    if (!rows.length) throw new BadRequestException('The uploaded file has no data rows');

    const products = await this.prisma.product.findMany({ select: { id: true, sku: true } });
    const productIdBySku = new Map(products.map((p) => [p.sku.trim().toLowerCase(), p.id]));

    const errors: PromoImportRowError[] = [];
    const items: PromoItemInputDto[] = [];

    rows.forEach((row, i) => {
      const rowNumber = i + 2; // header occupies row 1
      const { data, error } = parsePromoRow(row, productIdBySku);
      if (error) {
        errors.push({ row: rowNumber, message: error });
        return;
      }
      items.push(data!);
    });

    if (!items.length) {
      return { created: 0, failed: errors.length, errors, promo: null };
    }

    const promo = await this.publishBatch(items, undefined, user);
    return { created: items.length, failed: errors.length, errors, promo };
  }

  private async publishBatch(items: PromoItemInputDto[], title: string | undefined, user: User) {
    const promo = await this.prisma.$transaction(async (tx) => {
      await tx.promo.updateMany({ where: { is_active: true }, data: { is_active: false } });
      return tx.promo.create({
        data: {
          title,
          is_active: true,
          created_by_id: user.id,
          items: {
            create: items.map((item) => ({
              product_id: item.product_id,
              contenance: item.contenance,
              original_price: item.original_price,
              promo_price: item.promo_price,
            })),
          },
        },
        include: ITEMS_INCLUDE,
      });
    });

    await this.notifyUploaders(user.id);
    return promo;
  }

  private async notifyUploaders(creatorId: string) {
    const targets = await this.prisma.user.findMany({
      where: {
        is_active: true,
        id: { not: creatorId },
        custom_role: { permissions: { some: { permission: { code: 'promos.upload_picture' } } } },
      },
      select: { id: true },
    });

    await this.notifications.createForUsers(
      targets.map((t) => t.id),
      {
        type: NotificationType.promo_created,
        title: 'New promo published',
        body: 'A new promo batch is live — add your shelf photo once the label is in place.',
        link: '/promos',
      },
    );
  }

  // ─── Item management (Super Admin) ──────────────────────────────────────

  async updateItem(itemId: string, dto: UpdatePromoItemDto) {
    await this.findItemOrFail(itemId);
    return this.prisma.promoItem.update({
      where: { id: itemId },
      data: dto,
      include: { product: true },
    });
  }

  async removeItem(itemId: string) {
    await this.findItemOrFail(itemId);
    await this.prisma.promoItem.delete({ where: { id: itemId } });
  }

  async removeBatch(id: string) {
    await this.findBatchOrFail(id);
    await this.prisma.promo.delete({ where: { id } });
  }

  // ─── Pictures ────────────────────────────────────────────────────────────

  async uploadPicture(itemId: string, url: string, user: User) {
    await this.findItemOrFail(itemId);
    return this.prisma.promoItemPicture.upsert({
      where: { promo_item_id_user_id: { promo_item_id: itemId, user_id: user.id } },
      update: { image_url: url },
      create: { promo_item_id: itemId, user_id: user.id, image_url: url },
    });
  }

  async removePicture(itemId: string, user: User) {
    await this.prisma.promoItemPicture.deleteMany({
      where: { promo_item_id: itemId, user_id: user.id },
    });
  }

  /** Super Admin: who has started adding pictures for a batch, and how many. */
  async listPictureUploaders(promoId: string | undefined) {
    const promo = await this.resolvePromo(promoId);
    if (!promo) return { promo_id: null, total_items: 0, users: [] };

    const totalItems = await this.prisma.promoItem.count({ where: { promo_id: promo.id } });

    const pictures = await this.prisma.promoItemPicture.findMany({
      where: { promo_item: { promo_id: promo.id } },
      include: {
        user: { select: { id: true, full_name: true, email: true, role: true } },
      },
      orderBy: { updated_at: 'desc' },
    });

    const byUser = new Map<
      string,
      { user: (typeof pictures)[number]['user']; uploaded_count: number; last_upload_at: Date }
    >();
    for (const pic of pictures) {
      const existing = byUser.get(pic.user_id);
      if (existing) {
        existing.uploaded_count += 1;
      } else {
        byUser.set(pic.user_id, { user: pic.user, uploaded_count: 1, last_upload_at: pic.updated_at });
      }
    }

    return {
      promo_id: promo.id,
      total_items: totalItems,
      users: Array.from(byUser.values())
        .map(({ user, uploaded_count, last_upload_at }) => ({
          ...user,
          uploaded_count,
          last_upload_at,
        }))
        .sort((a, b) => b.uploaded_count - a.uploaded_count),
    };
  }

  /** Super Admin: exactly what one uploader sees — same items, only their own pictures. */
  async getUserPictureView(promoId: string | undefined, targetUserId: string) {
    const promo = await this.resolvePromo(promoId);
    if (!promo) throw new NotFoundException('No promo found');

    const items = await this.prisma.promoItem.findMany({
      where: { promo_id: promo.id },
      include: { product: true, pictures: { where: { user_id: targetUserId } } },
      orderBy: { created_at: 'asc' },
    });

    return {
      promo_id: promo.id,
      title: promo.title,
      items: items.map(({ pictures, ...item }) => ({
        ...item,
        my_picture: pictures[0] ?? null,
      })),
    };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private async resolvePromo(promoId: string | undefined) {
    if (promoId) return this.findBatchOrFail(promoId);
    return this.prisma.promo.findFirst({ where: { is_active: true } });
  }

  private async attachOwnPictures<T extends { items: { id: string }[] }>(promo: T, userId: string) {
    const itemIds = promo.items.map((i) => i.id);
    const pictures = itemIds.length
      ? await this.prisma.promoItemPicture.findMany({
          where: { user_id: userId, promo_item_id: { in: itemIds } },
        })
      : [];
    const byItemId = new Map(pictures.map((p) => [p.promo_item_id, p]));

    return {
      ...promo,
      items: promo.items.map((item) => ({ ...item, my_picture: byItemId.get(item.id) ?? null })),
    };
  }

  private async assertProductsExist(ids: string[]) {
    const unique = Array.from(new Set(ids));
    const count = await this.prisma.product.count({ where: { id: { in: unique } } });
    if (count !== unique.length) throw new BadRequestException('One or more products were not found');
  }

  private async findBatchOrFail(id: string) {
    const promo = await this.prisma.promo.findUnique({ where: { id }, include: ITEMS_INCLUDE });
    if (!promo) throw new NotFoundException('Promo not found');
    return promo;
  }

  private async findItemOrFail(id: string) {
    const item = await this.prisma.promoItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Promo item not found');
    return item;
  }
}
