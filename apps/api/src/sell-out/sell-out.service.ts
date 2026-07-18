import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { User } from '@prisma/client';
import * as XLSX from 'xlsx';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSellOutDto } from './dto/create-sell-out.dto';
import { parseSellOutRow } from './sell-out-import.util';

export interface BulkImportRowError {
  row: number;
  message: string;
}

export interface BulkImportResult {
  created: number;
  failed: number;
  errors: BulkImportRowError[];
}

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

  async bulkImportFromFile(buffer: Buffer, user: User): Promise<BulkImportResult> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new BadRequestException('The uploaded file has no sheets');

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], {
      defval: '',
    });
    if (!rows.length) throw new BadRequestException('The uploaded file has no data rows');

    const [stores, products] = await Promise.all([
      this.prisma.store.findMany({ select: { id: true, name: true } }),
      this.prisma.product.findMany({ select: { id: true, sku: true } }),
    ]);
    const storesByName = new Map(stores.map((s) => [s.name.trim().toLowerCase(), s.id]));
    const productsBySku = new Map(products.map((p) => [p.sku.trim().toLowerCase(), p.id]));

    const errors: BulkImportRowError[] = [];
    let created = 0;

    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 2; // header occupies row 1
      const { data, error } = parseSellOutRow(rows[i], storesByName, productsBySku);
      if (error) {
        errors.push({ row: rowNumber, message: error });
        continue;
      }

      try {
        await this.create(data!, user);
        created++;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to import row';
        errors.push({ row: rowNumber, message });
      }
    }

    return { created, failed: errors.length, errors };
  }
}
