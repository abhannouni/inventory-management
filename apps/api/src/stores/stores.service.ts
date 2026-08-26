import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, User, UserRole, VisitStatus } from '@prisma/client';
import * as XLSX from 'xlsx';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { visibleStoresWhere } from './store-scope';
import { parseStoreRow } from './store-import.util';

export interface BulkImportRowError {
  row: number;
  message: string;
}

export interface BulkImportResult {
  created: number;
  failed: number;
  errors: BulkImportRowError[];
}

/**
 * Maps a store DTO onto Prisma's shape.
 *
 * Two things this has to get right:
 *  - only keys the caller actually sent are copied, so a PATCH of one field
 *    cannot silently blank the rest of the profile;
 *  - `opening_date` arrives as an ISO string and must become a Date, which
 *    Prisma will not coerce for a `@db.Date` column.
 */
type StoreWritable = Partial<Prisma.StoreUncheckedCreateInput>;

function toStoreData(dto: CreateStoreDto | UpdateStoreDto): StoreWritable {
  const data: StoreWritable = {};

  const copy = <K extends keyof (CreateStoreDto & UpdateStoreDto)>(key: K) => {
    if (dto[key] !== undefined) {
      (data as Record<string, unknown>)[key as string] = dto[key];
    }
  };

  (
    [
      'name',
      'brand',
      'channel',
      'classification',
      'address',
      'city',
      'postal_code',
      'region_id',
      'section_manager_name',
      'section_manager_phone',
      'department_manager_name',
      'department_manager_phone',
      'gds_name',
      'gds_phone',
      'latitude',
      'longitude',
      'google_maps_url',
      'is_active',
      'visible_to_gm',
    ] as const
  ).forEach(copy);

  if (dto.opening_date !== undefined) {
    data.opening_date = new Date(dto.opening_date);
  }

  return data;
}

@Injectable()
export class StoresService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Every POS the user is authorized to see, in one scoped query.
   * The scope comes from `visibleStoresWhere`, so a supervisor, an admin and
   * General Management each get exactly their slice — decided server-side.
   */
  async findAll(user: User) {
    return this.prisma.store.findMany({
      where: await visibleStoresWhere(this.prisma, user),
      include: { region: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, user: User) {
    // Fold the visibility rule into the lookup: a store outside the user's scope
    // is indistinguishable from one that does not exist — no id probing.
    const scope = await visibleStoresWhere(this.prisma, user);
    const store = await this.prisma.store.findFirst({
      where: { AND: [{ id }, scope] },
      include: { region: true },
    });
    if (!store) throw new NotFoundException('Store not found');
    return store;
  }

  /**
   * The rich profile behind the Point of Sale details page: everything the app
   * has real data for, aggregated in one call and scoped the same way as the
   * list. Sections the schema does not model yet (sell-out, merchandising,
   * TG/MEA/PLV) are surfaced by the frontend as "not tracked" — never faked here.
   */
  async overview(id: string, user: User) {
    const store = await this.findOne(id, user); // throws if out of scope

    const [team, visits, productStores] = await Promise.all([
      // Assigned field team — who covers this POS.
      this.prisma.userStore.findMany({
        where: { store_id: id },
        include: {
          user: {
            select: { id: true, full_name: true, email: true, role: true, is_active: true },
          },
        },
      }),
      // Visit history with the audit rows, newest first. `planned` rows are
      // calendar entries, not visits that happened — they stay out of history.
      this.prisma.visit.findMany({
        where: { store_id: id, status: { not: VisitStatus.planned } },
        orderBy: { checkin_time: 'desc' },
        take: 50,
        include: {
          user: { select: { id: true, full_name: true, role: true } },
          auditItems: { include: { product: true } },
        },
      }),
      // Expected shelf presence for this POS.
      this.prisma.productStore.findMany({
        where: { store_id: id },
        include: { product: true },
      }),
    ]);

    // Latest audited quantity per product, from the most recent visit that saw it.
    const latestByProduct = new Map<
      string,
      { qty_found: number; status: string; checkin_at: Date | null; visit_id: string }
    >();
    for (const v of visits) {
      for (const ai of v.auditItems) {
        if (!latestByProduct.has(ai.product_id)) {
          latestByProduct.set(ai.product_id, {
            qty_found: ai.qty_found,
            status: ai.status,
            checkin_at: v.checkin_time,
            visit_id: v.id,
          });
        }
      }
    }

    const productAvailability = productStores.map((ps) => {
      const latest = latestByProduct.get(ps.product_id);
      return {
        product: ps.product,
        expected_qty: ps.expected_qty,
        last_qty_found: latest?.qty_found ?? null,
        last_status: latest?.status ?? null,
        last_seen_at: latest?.checkin_at ?? null,
      };
    });

    // Stockouts — products found empty, most recent first.
    const stockouts = visits
      .flatMap((v) =>
        v.auditItems
          .filter((ai) => ai.status === 'out_of_stock')
          .map((ai) => ({
            product: ai.product,
            checkin_at: v.checkin_time,
            visit_id: v.id,
            reported_by: v.user,
          })),
      )
      .slice(0, 30);

    // Field evidence — every audit photo, newest first.
    const photos = visits
      .flatMap((v) =>
        v.auditItems
          .filter((ai) => ai.photo_url)
          .map((ai) => ({
            url: ai.photo_url as string,
            product: ai.product,
            checkin_at: v.checkin_time,
            visit_id: v.id,
          })),
      )
      .slice(0, 40);

    const audited = productAvailability.filter((p) => p.last_status);
    const inStock = audited.filter((p) => p.last_status === 'in_stock').length;
    const stockDisponible = audited.filter((p) => p.last_status === 'stock_disponible').length;
    const lowStock = audited.filter((p) => p.last_status === 'low_stock').length;
    const outOfStock = audited.filter((p) => p.last_status === 'out_of_stock').length;

    return {
      store,
      team: team.map((t) => t.user),
      visits: visits.map((v) => ({
        id: v.id,
        status: v.status,
        checkin_at: v.checkin_time,
        checkout_at: v.checkout_time,
        duration_seconds: v.duration_seconds,
        user: v.user,
        audited: v.auditItems.length,
      })),
      product_availability: productAvailability,
      stock_summary: {
        expected_products: productStores.length,
        audited: audited.length,
        in_stock: inStock,
        stock_disponible: stockDisponible,
        low_stock: lowStock,
        out_of_stock: outOfStock,
      },
      stockouts,
      photos,
    };
  }

  async create(dto: CreateStoreDto, user: User) {
    if (user.role === UserRole.admin) {
      if (dto.region_id !== user.region_id) {
        throw new ForbiddenException('Admin can only create stores in their own region');
      }
    }

    return this.prisma.store.create({
      data: { ...toStoreData(dto), name: dto.name, region_id: dto.region_id },
      include: { region: true },
    });
  }

  async update(id: string, dto: UpdateStoreDto, user: User) {
    const store = await this.findOrFail(id);
    await this.assertRegionAccess(store, user);

    if (dto.region_id && user.role === UserRole.admin && dto.region_id !== user.region_id) {
      throw new ForbiddenException('Admin cannot move a store to another region');
    }

    return this.prisma.store.update({
      where: { id },
      data: toStoreData(dto),
      include: { region: true },
    });
  }

  async remove(id: string, user: User) {
    const store = await this.findOrFail(id);
    await this.assertRegionAccess(store, user);
    await this.prisma.store.delete({ where: { id } });
  }

  async bulkImportFromFile(
    buffer: Buffer,
    user: User,
  ): Promise<BulkImportResult> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName)
      throw new BadRequestException('The uploaded file has no sheets');

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets[sheetName],
      { defval: '' },
    );
    if (!rows.length)
      throw new BadRequestException('The uploaded file has no data rows');

    const regions = await this.prisma.region.findMany();
    const regionsByName = new Map(
      regions.map((r) => [r.name.trim().toLowerCase(), r.id]),
    );

    const errors: BulkImportRowError[] = [];
    let created = 0;

    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 2; // header occupies row 1
      const { data, error } = parseStoreRow(rows[i], regionsByName);
      if (error) {
        errors.push({ row: rowNumber, message: error });
        continue;
      }

      try {
        await this.create(data!, user);
        created++;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to import row';
        errors.push({ row: rowNumber, message });
      }
    }

    return { created, failed: errors.length, errors };
  }

  private assertRegionAccess(store: { region_id: string | null }, user: User) {
    if (user.role === UserRole.admin && store.region_id !== user.region_id) {
      throw new ForbiddenException('Access to this store is not allowed');
    }
  }

  private async findOrFail(id: string) {
    const store = await this.prisma.store.findUnique({ where: { id } });
    if (!store) throw new NotFoundException('Store not found');
    return store;
  }
}
