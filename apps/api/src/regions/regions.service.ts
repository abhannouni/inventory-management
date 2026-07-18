import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { adminAssignedStoreIds } from '../stores/store-scope';
import { CreateRegionDto } from './dto/create-region.dto';
import { UpdateRegionDto } from './dto/update-region.dto';

@Injectable()
export class RegionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: User) {
    if (user.role === UserRole.admin) {
      const assignedRegionIds = await this.adminVisibleRegionIds(user);
      if (assignedRegionIds) {
        return this.prisma.region.findMany({
          where: { id: { in: assignedRegionIds } },
          orderBy: { name: 'asc' },
        });
      }
      if (!user.region_id) return [];
      const region = await this.prisma.region.findUnique({
        where: { id: user.region_id },
      });
      return region ? [region] : [];
    }
    return this.prisma.region.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string, user: User) {
    await this.assertAccess(id, user);
    const region = await this.prisma.region.findUnique({ where: { id } });
    if (!region) throw new NotFoundException('Region not found');
    return region;
  }

  async create(dto: CreateRegionDto) {
    return this.prisma.region.create({ data: { name: dto.name } });
  }

  async update(id: string, dto: UpdateRegionDto) {
    await this.findOrFail(id);
    return this.prisma.region.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOrFail(id);
    await this.prisma.region.delete({ where: { id } });
  }

  private async assertAccess(id: string, user: User) {
    if (user.role !== UserRole.admin) return;

    const assignedRegionIds = await this.adminVisibleRegionIds(user);
    const allowed = assignedRegionIds ? assignedRegionIds.includes(id) : user.region_id === id;
    if (!allowed) throw new ForbiddenException('Access to this region is not allowed');
  }

  /** Distinct regions covered by this admin's assigned PDVs, or `null` if none are assigned. */
  private async adminVisibleRegionIds(user: User): Promise<string[] | null> {
    const assigned = await adminAssignedStoreIds(this.prisma, user.id);
    if (!assigned) return null;
    const stores = await this.prisma.store.findMany({
      where: { id: { in: assigned } },
      select: { region_id: true },
      distinct: ['region_id'],
    });
    return stores.map((s) => s.region_id).filter((id): id is string => !!id);
  }

  private async findOrFail(id: string) {
    const region = await this.prisma.region.findUnique({ where: { id } });
    if (!region) throw new NotFoundException('Region not found');
    return region;
  }
}
