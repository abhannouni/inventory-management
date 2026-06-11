import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';

@Injectable()
export class StoresService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: User) {
    if (user.role === UserRole.supervisor || user.role === UserRole.merchandiser) {
      const assignments = await this.prisma.userStore.findMany({
        where: { user_id: user.id },
        include: { store: { include: { region: true } } },
      });
      return assignments.map((a) => a.store);
    }

    if (user.role === UserRole.admin) {
      return this.prisma.store.findMany({
        where: { region_id: user.region_id ?? undefined },
        include: { region: true },
        orderBy: { name: 'asc' },
      });
    }

    return this.prisma.store.findMany({
      include: { region: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, user: User) {
    const store = await this.prisma.store.findUnique({
      where: { id },
      include: { region: true },
    });
    if (!store) throw new NotFoundException('Store not found');

    await this.assertReadAccess(store, user);
    return store;
  }

  async create(dto: CreateStoreDto, user: User) {
    if (user.role === UserRole.admin) {
      if (dto.region_id !== user.region_id) {
        throw new ForbiddenException('Admin can only create stores in their own region');
      }
    }

    return this.prisma.store.create({
      data: {
        name: dto.name,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
        region_id: dto.region_id,
      },
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
      data: dto,
      include: { region: true },
    });
  }

  async remove(id: string, user: User) {
    const store = await this.findOrFail(id);
    await this.assertRegionAccess(store, user);
    await this.prisma.store.delete({ where: { id } });
  }

  private async assertReadAccess(store: { id: string; region_id: string | null }, user: User) {
    if (user.role === UserRole.admin) {
      if (store.region_id !== user.region_id) {
        throw new ForbiddenException('Access to this store is not allowed');
      }
      return;
    }
    if (user.role === UserRole.supervisor || user.role === UserRole.merchandiser) {
      const assignment = await this.prisma.userStore.findFirst({
        where: { user_id: user.id, store_id: store.id },
      });
      if (!assignment) throw new ForbiddenException('Access to this store is not allowed');
    }
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
