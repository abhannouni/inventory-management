import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRegionDto } from './dto/create-region.dto';
import { UpdateRegionDto } from './dto/update-region.dto';

@Injectable()
export class RegionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: User) {
    if (user.role === UserRole.admin) {
      if (!user.region_id) return [];
      const region = await this.prisma.region.findUnique({
        where: { id: user.region_id },
      });
      return region ? [region] : [];
    }
    return this.prisma.region.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string, user: User) {
    this.assertAccess(id, user);
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

  private assertAccess(id: string, user: User) {
    if (user.role === UserRole.admin && user.region_id !== id) {
      throw new ForbiddenException('Access to this region is not allowed');
    }
  }

  private async findOrFail(id: string) {
    const region = await this.prisma.region.findUnique({ where: { id } });
    if (!region) throw new NotFoundException('Region not found');
    return region;
  }
}
