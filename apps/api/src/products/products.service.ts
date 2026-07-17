import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  BOURCHANIN_CANONICAL_NAME,
  isBourchaninDistributor,
} from './product-classification';
import { parseProductRow } from './product-import.util';

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
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeCreateData(dto: CreateProductDto) {
    const distributeur = dto.distributeur.trim();
    const isOurProduct =
      dto.is_our_product || isBourchaninDistributor(distributeur);

    return {
      ...dto,
      distributeur: isOurProduct ? BOURCHANIN_CANONICAL_NAME : distributeur,
      is_our_product: isOurProduct,
    };
  }

  private normalizeUpdateData(dto: UpdateProductDto) {
    const data: UpdateProductDto = { ...dto };

    if (typeof dto.distributeur === 'string') {
      const distributeur = dto.distributeur.trim();
      const isOurProduct =
        dto.is_our_product || isBourchaninDistributor(distributeur);

      data.distributeur = isOurProduct
        ? BOURCHANIN_CANONICAL_NAME
        : distributeur;
      data.is_our_product = isOurProduct;
    } else if (typeof dto.is_our_product === 'boolean') {
      data.is_our_product = dto.is_our_product;
    }

    return data;
  }

  findAll() {
    return this.prisma.product.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(dto: CreateProductDto) {
    const exists = await this.prisma.product.findUnique({
      where: { sku: dto.sku },
    });
    if (exists) throw new ConflictException('SKU already exists');
    return this.prisma.product.create({ data: this.normalizeCreateData(dto) });
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);

    if (dto.sku) {
      const conflict = await this.prisma.product.findFirst({
        where: { sku: dto.sku, NOT: { id } },
      });
      if (conflict) throw new ConflictException('SKU already exists');
    }

    return this.prisma.product.update({
      where: { id },
      data: this.normalizeUpdateData(dto),
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.product.delete({ where: { id } });
  }

  async bulkImportFromFile(buffer: Buffer): Promise<BulkImportResult> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName)
      throw new BadRequestException('The uploaded file has no sheets');

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets[sheetName],
      {
        defval: '',
      },
    );
    if (!rows.length)
      throw new BadRequestException('The uploaded file has no data rows');

    const errors: BulkImportRowError[] = [];
    let created = 0;

    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 2; // header occupies row 1
      const { data, error } = parseProductRow(rows[i]);
      if (error) {
        errors.push({ row: rowNumber, message: error });
        continue;
      }

      try {
        await this.create(data!);
        created++;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to import row';
        errors.push({ row: rowNumber, message });
      }
    }

    return { created, failed: errors.length, errors };
  }
}
